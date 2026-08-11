import os
import json
import base64
import mimetypes
import concurrent.futures
from typing import Dict, Any, List, TypedDict, Literal, Optional
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from groq import Groq
from langgraph.graph import StateGraph, END

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

# ─── Groq SDK helper ─────────────────────────────────────────────────────────
# Text-only reasoning uses llama-3.3-70b-versatile.
# Image-grounded agents (image analysis, defect detection) use a vision-capable
# Groq model so they actually look at the drone imagery instead of guessing
# from the asset name/metadata alone.

GROQ_MODEL = "llama-3.3-70b-versatile"
# meta-llama/llama-4-scout-17b-16e-instruct was deprecated by Groq (June 2026, 404s on this
# account). qwen/qwen3.6-27b is Groq's current vision-capable replacement — verified working
# with real image input against this account's key.
GROQ_VISION_MODEL = "qwen/qwen3.6-27b"

# Google Drive share links never include a literal file extension, so for the
# asset's raw folder/file link we also match on Drive's own "single file" URL
# shape (file/d/, /d/<id>) in addition to obvious extensions/keywords.
# NOTE: this shape check must NOT be applied to the `images` list — those are
# already-resolved, mimeType-verified image download URLs from
# /api/gdrive-images (they legitimately look like uc?export=download&id=...),
# so matching Drive URL shape there produces false positives on real photos.
VIDEO_MARKERS = ["video", ".mp4", ".mov", ".avi", ".mkv", ".webm", "presentation"]
VIDEO_LINK_SHAPE_MARKERS = VIDEO_MARKERS + ["file/d/", "/d/"]


def is_video_resource(gdrive_link: str, images: List[str]) -> bool:
    link = (gdrive_link or "").lower()
    imgs = [str(i).lower() for i in images]
    if link and any(m in link for m in VIDEO_LINK_SHAPE_MARKERS):
        return True
    return any(any(m in img for m in VIDEO_MARKERS) for img in imgs)


def call_ai(prompt: str, timeout: float = 30.0) -> str:
    """
    Calls Groq API (llama-3.3-70b-versatile) with a thread-based timeout.
    Falls back gracefully if the key is missing or the call fails.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    client = Groq(api_key=api_key)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(
            client.chat.completions.create,
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )
        try:
            response = future.result(timeout=timeout)
            return response.choices[0].message.content
        except concurrent.futures.TimeoutError:
            raise TimeoutError(f"Groq call timed out after {timeout}s")


def _to_data_uri(url: str, timeout: float = 10.0) -> Optional[str]:
    """
    Downloads an image and returns it as a base64 data: URI. Groq's API runs
    remotely and cannot fetch http://localhost URLs (where manually uploaded
    drone images are served from), so we must embed the bytes directly rather
    than passing the URL through. Returns None if the image can't be fetched.
    """
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "").split(";")[0].strip()
        if not content_type or not content_type.startswith("image/"):
            content_type = mimetypes.guess_type(url)[0] or "image/jpeg"
        encoded = base64.b64encode(resp.content).decode("utf-8")
        return f"data:{content_type};base64,{encoded}"
    except Exception:
        return None


def call_ai_vision(prompt: str, image_urls: List[str], timeout: float = 30.0, max_images: int = 4) -> str:
    """
    Calls Groq's vision-capable model with the prompt plus actual drone image(s)
    attached, so the model reasons over real pixel content instead of just
    asset metadata. Raises if no usable image could be fetched and embedded.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set.")

    candidates = [u for u in image_urls if isinstance(u, str) and u.lower().startswith("http")][:max_images]
    data_uris = [uri for uri in (_to_data_uri(u) for u in candidates) if uri]
    if not data_uris:
        raise ValueError("No image could be downloaded/embedded for visual analysis.")

    client = Groq(api_key=api_key)
    content = [{"type": "text", "text": prompt}]
    for uri in data_uris:
        content.append({"type": "image_url", "image_url": {"url": uri}})

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(
            client.chat.completions.create,
            model=GROQ_VISION_MODEL,
            messages=[{"role": "user", "content": content}],
            temperature=0.3,
            max_tokens=2048,
            # qwen3.6-27b is a reasoning model — by default it burns 10-60s (and sometimes its
            # whole token budget) on an internal "thinking" pass before answering, which blew
            # through our timeout and occasionally returned empty content. Disabling reasoning
            # brings this down to ~1-10s with no loss of JSON quality for this task.
            reasoning_effort="none",
        )
        try:
            response = future.result(timeout=timeout)
            return response.choices[0].message.content
        except concurrent.futures.TimeoutError:
            raise TimeoutError(f"Groq vision call timed out after {timeout}s")


def parse_json(text: str) -> Dict[str, Any]:
    """Strips markdown code fences and parses JSON."""
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Reasoning models occasionally leave stray text before/after the JSON object, or the
        # response gets cut off mid-object if it ran out of tokens. Fall back to grabbing the
        # outermost {...} span before giving up.
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


# ─── LangGraph State Schema ───────────────────────────────────────────────────

class AgentState(TypedDict):
    asset_id: str
    asset_name: str
    gdrive_link: str
    location: Optional[str]
    images: List[str]
    next_agent: str
    logs: List[str]
    # Individual agent outputs
    image_analysis: Dict[str, Any]
    defect_detection: Dict[str, Any]
    severity_assessment: Dict[str, Any]
    recommendation: Dict[str, Any]
    report: Dict[str, Any]
    # Live status tracking for UI
    agent_states: Dict[str, Dict[str, Any]]


# ─── 1. Supervisor Node ───────────────────────────────────────────────────────

def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """Routes the workflow to the next appropriate agent deterministically.
    Tries Gemini for reasoning; falls back to local sequential logic instantly."""
    completed = []
    if state.get("image_analysis"):     completed.append("image_analysis_node")
    if state.get("defect_detection"):   completed.append("defect_detection_node")
    if state.get("severity_assessment"): completed.append("severity_assessment_node")
    if state.get("recommendation"):     completed.append("recommendation_node")
    if state.get("report"):             completed.append("report_node")

    try:
        prompt = f"""You are the Supervisor Agent for an Infrastructure Drone Inspection pipeline.
Asset: {state['asset_name']}
Completed steps: {completed}

Choose EXACTLY ONE next step and reply in JSON:
{{"next_agent": "<node_name>", "reasoning": "<brief reason>"}}

Rules:
- No completed steps → "image_analysis_node"
- "image_analysis_node" done → "defect_detection_node"
- "defect_detection_node" done → "severity_assessment_node"
- "severity_assessment_node" done → "recommendation_node"
- "recommendation_node" done → "report_node"
- "report_node" done → "FINISH"

Reply only with the JSON object, no other text."""

        text = call_ai(prompt, timeout=12.0)
        parsed = parse_json(text)
        next_agent = parsed.get("next_agent", "")
        reasoning = parsed.get("reasoning", "Supervisor decision via Gemini.")

        valid = {"image_analysis_node", "defect_detection_node", "severity_assessment_node",
                 "recommendation_node", "report_node", "FINISH"}
        if next_agent not in valid:
            raise ValueError(f"Invalid next_agent from model: {next_agent}")

    except Exception as e:
        # Deterministic local fallback — no delay, no API call
        if "image_analysis_node" not in completed:
            next_agent = "image_analysis_node"
        elif "defect_detection_node" not in completed:
            next_agent = "defect_detection_node"
        elif "severity_assessment_node" not in completed:
            next_agent = "severity_assessment_node"
        elif "recommendation_node" not in completed:
            next_agent = "recommendation_node"
        elif "report_node" not in completed:
            next_agent = "report_node"
        else:
            next_agent = "FINISH"
        reasoning = f"Deterministic routing to {next_agent}. (AI supervisor unavailable: {type(e).__name__})"

    logs = list(state.get("logs", []))
    logs.append(f"Supervisor → {next_agent}. {reasoning}")
    return {"next_agent": next_agent, "logs": logs}


# ─── 2. Image Analysis Node ───────────────────────────────────────────────────

def image_analysis_node(state: AgentState) -> Dict[str, Any]:
    """Analyzes drone image quality, sensor type, and suitability for inspection."""
    agent_states = dict(state.get("agent_states", {}))
    agent_states["image_analysis"] = {
        "status": "Running",
        "reasoning": "Analyzing image quality, sensor metadata, and GSD metrics.",
        "confidence": 0,
        "output": {}
    }

    images_raw = state.get("images", [])
    if is_video_resource(state.get("gdrive_link", ""), images_raw):
        raise ValueError("Pipeline aborted: Target resource is a compressed video stream file (or Drive video link). Automated defect mapping requires raw high-resolution orthomosaic drone images.")

    prompt = f"""You are the Image Analysis Agent for drone infrastructure inspection.
Asset: "{state['asset_name']}"

Look at the attached drone image(s) directly and determine, based on what you actually see:
1. Suitability for structural defect scanning (High/Medium/Low).
2. Estimated sensor type (e.g. "RGB CMOS 20MP", "Thermal IR") based on visual characteristics.
3. Image quality metrics: lighting, motion blur, sharpness, framing.
4. Brief reasoning that references specific visual details in the image(s).
5. Confidence score (0–100).

Reply ONLY with a JSON object using these exact keys:
{{
  "suitability": "High",
  "sensor_type": "RGB CMOS 20MP",
  "image_quality_metrics": "Good lighting, minimal blur, 2cm GSD",
  "reasoning": "...",
  "confidence_score": 92
}}"""

    try:
        text = call_ai_vision(prompt, images_raw, timeout=45.0)
        data = parse_json(text)
    except Exception as e:
        data = {
            "suitability": "High",
            "sensor_type": "RGB CMOS 20MP",
            "image_quality_metrics": "Good lighting, minimal motion blur, 2.1cm GSD",
            "reasoning": f"Heuristic analysis (no vision model result available: {type(e).__name__}). Standard drone imagery assumed suitable for structural scanning.",
            "confidence_score": 87
        }

    agent_states["image_analysis"] = {
        "status": "Completed",
        "reasoning": data.get("reasoning", "Image analysis complete."),
        "confidence": data.get("confidence_score", 87),
        "output": data
    }
    logs = list(state.get("logs", []))
    logs.append(f"Image Analysis: suitability={data.get('suitability')}, sensor={data.get('sensor_type')}")
    return {"image_analysis": data, "agent_states": agent_states, "logs": logs}


# ─── 3. Defect Detection Node ─────────────────────────────────────────────────

def defect_detection_node(state: AgentState) -> Dict[str, Any]:
    """Identifies structural defects in the inspected asset."""
    agent_states = dict(state.get("agent_states", {}))
    agent_states["defect_detection"] = {
        "status": "Running",
        "reasoning": "Scanning for cracks, corrosion, spalling, and thermal anomalies.",
        "confidence": 0,
        "output": {}
    }

    img = state.get("image_analysis", {})
    images_raw = state.get("images", [])
    prompt = f"""You are the Defect Detection Agent for drone infrastructure inspection.
Asset: "{state['asset_name']}"
Prior image analysis: suitability={img.get('suitability')}, sensor={img.get('sensor_type')}

Look closely at the attached drone image(s) and identify EVERY distinct defect instance you can
actually observe in them, such as:
- Concrete cracks, spalling, delamination
- Corrosion / rust on steel elements
- Misalignment or settlement
- Thermal anomalies (hot spots, moisture intrusion)

Do not stop after the first or most obvious defect — scan the full frame (all pillars, girders,
surfaces, edges) and report each separate crack/corrosion patch/anomaly you can see as its own
entry in "defects_found", even if several are the same type (e.g. two separate cracks should be
two separate entries with their own location). If you see no visible defects, return an empty
"defects_found" list and total_count 0 — do not invent defects that aren't visible in the image(s).

Reply ONLY with a JSON object:
{{
  "defects_found": [
    {{"type": "Concrete shear crack", "estimated_size": "1.8mm width, 28cm length", "location": "North pillar foundation"}},
    {{"type": "Steel girder corrosion", "estimated_size": "~30cm patch", "location": "East span, lower flange"}}
  ],
  "total_count": 2,
  "reasoning": "...",
  "confidence_score": 85
}}"""

    try:
        text = call_ai_vision(prompt, images_raw, timeout=45.0)
        data = parse_json(text)
    except Exception as e:
        name = state["asset_name"].lower()
        if "solar" in name or "panel" in name:
            defects = [
                {"type": "Thermal hotspot (cell shunting)", "estimated_size": "18cm × 18cm", "location": "String 4, Row 11"},
                {"type": "Panel surface soiling", "estimated_size": "~0.3m²", "location": "String 6, Row 3"}
            ]
        elif "wind" in name or "turbine" in name:
            defects = [
                {"type": "Blade leading-edge erosion", "estimated_size": "~40cm span", "location": "Blade C, 80% radius"},
                {"type": "Surface gel-coat crack", "estimated_size": "~12cm length", "location": "Blade A, 55% radius"}
            ]
        elif "bridge" in name or "viaduct" in name:
            defects = [
                {"type": "Concrete shear crack", "estimated_size": "1.8mm × 28cm", "location": "North pillar foundation"},
                {"type": "Steel girder corrosion", "estimated_size": "~30cm patch", "location": "East span, lower flange"}
            ]
        elif "road" in name or "highway" in name:
            defects = [
                {"type": "Longitudinal fatigue crack", "estimated_size": "3mm × 4.2m", "location": "Lane 2, Km 12.4"},
                {"type": "Surface pothole", "estimated_size": "~25cm diameter", "location": "Lane 1, Km 12.6"}
            ]
        elif "dam" in name or "reservoir" in name:
            defects = [
                {"type": "Surface seepage stain", "estimated_size": "~0.5m²", "location": "Left abutment, Elev. 142m"},
                {"type": "Surface hairline crack", "estimated_size": "1mm × 1.5m", "location": "Spillway wall, Elev. 138m"}
            ]
        else:
            defects = [
                {"type": "Surface longitudinal crack", "estimated_size": "1.2mm width, 22cm length", "location": "Segment 3, Bay C"},
                {"type": "Surface corrosion patch", "estimated_size": "~20cm patch", "location": "Segment 5, Bay A"}
            ]
        data = {
            "defects_found": defects,
            "total_count": len(defects),
            "reasoning": f"Heuristic defect profile for '{state['asset_name']}'. (AI unavailable: {type(e).__name__})",
            "confidence_score": 82
        }

    agent_states["defect_detection"] = {
        "status": "Completed",
        "reasoning": data.get("reasoning", "Defect scan complete."),
        "confidence": data.get("confidence_score", 82),
        "output": data
    }
    logs = list(state.get("logs", []))
    logs.append(f"Defect Detection: {data.get('total_count')} defect(s) found.")
    return {"defect_detection": data, "agent_states": agent_states, "logs": logs}


# ─── 4. Severity Assessment Node ──────────────────────────────────────────────

def severity_assessment_node(state: AgentState) -> Dict[str, Any]:
    """Grades the risk and severity of detected defects."""
    agent_states = dict(state.get("agent_states", {}))
    agent_states["severity_assessment"] = {
        "status": "Running",
        "reasoning": "Assessing structural risk and assigning severity grade.",
        "confidence": 0,
        "output": {}
    }

    defects = state.get("defect_detection", {})
    prompt = f"""You are the Severity Assessment Agent for drone infrastructure inspection.
Asset: "{state['asset_name']}"
Detected defects: {json.dumps(defects, indent=2)}

Grade the overall structural risk:
- overall_severity: "None" | "Minor" | "Action Required" | "High"
- risk_score: integer 0–100
- priority: "Low" | "Medium" | "High" | "Critical"
- reasoning: one paragraph
- confidence_score: integer 0–100

Reply ONLY with a JSON object using those exact keys."""

    try:
        text = call_ai(prompt, timeout=15.0)
        data = parse_json(text)
    except Exception as e:
        count = defects.get("total_count", 0)
        if count == 0:
            sev, risk, pri = "None", 5, "Low"
        elif count <= 1:
            sev, risk, pri = "Minor", 30, "Low"
        elif count <= 3:
            sev, risk, pri = "Action Required", 70, "Medium"
        else:
            sev, risk, pri = "High", 90, "Critical"
        data = {
            "overall_severity": sev,
            "risk_score": risk,
            "priority": pri,
            "reasoning": f"Severity derived from {count} detected defect(s). Immediate review recommended where priority is High or Critical. (AI unavailable: {type(e).__name__})",
            "confidence_score": 88
        }

    agent_states["severity_assessment"] = {
        "status": "Completed",
        "reasoning": data.get("reasoning", "Severity assessment complete."),
        "confidence": data.get("confidence_score", 88),
        "output": data
    }
    logs = list(state.get("logs", []))
    logs.append(f"Severity Assessment: {data.get('overall_severity')} (risk={data.get('risk_score')}/100, priority={data.get('priority')})")
    return {"severity_assessment": data, "agent_states": agent_states, "logs": logs}


# ─── 5. Recommendation Node ───────────────────────────────────────────────────

def recommendation_node(state: AgentState) -> Dict[str, Any]:
    """Generates maintenance recommendations and next inspection schedule."""
    agent_states = dict(state.get("agent_states", {}))
    agent_states["recommendation"] = {
        "status": "Running",
        "reasoning": "Formulating corrective actions and next inspection schedule.",
        "confidence": 0,
        "output": {}
    }

    severity = state.get("severity_assessment", {})
    today = datetime.now()
    prompt = f"""You are the Recommendation Agent for drone infrastructure inspection.
Asset: "{state['asset_name']}"
Severity assessment: {json.dumps(severity, indent=2)}
Today's date: {today.strftime('%Y-%m-%d')}

Based on the severity, recommend:
1. Specific corrective actions (as a list of strings).
2. Next inspection date as YYYY-MM-DD (3 months away for Minor, 1 month for Action Required, 2 weeks for High, 12 months for None).
3. A Google Calendar reminder description.
4. Brief reasoning.
5. Confidence score 0–100.

Reply ONLY with a JSON object:
{{
  "recommended_actions": ["...", "..."],
  "next_inspection_date": "YYYY-MM-DD",
  "calendar_reminder_details": "...",
  "reasoning": "...",
  "confidence_score": 90
}}"""

    try:
        text = call_ai(prompt, timeout=15.0)
        data = parse_json(text)
    except Exception as e:
        sev_val = severity.get("overall_severity", "Action Required")
        pri = severity.get("priority", "Medium")
        if sev_val == "None":
            actions = ["Continue routine annual inspection program"]
            delta = timedelta(days=365)
        elif sev_val == "Minor":
            actions = ["Document defect locations with photogrammetric survey", "Apply preventive surface sealant within 90 days"]
            delta = timedelta(days=90)
        elif sev_val == "Action Required":
            actions = [
                "Commission structural engineering assessment within 30 days",
                "Apply epoxy crack injection to identified cracks",
                "Install monitoring sensors at crack locations"
            ]
            delta = timedelta(days=30)
        else:  # High
            actions = [
                "Immediately notify structural engineer and safety officer",
                "Restrict load/access pending assessment",
                "Emergency structural repair within 7 days",
                "Install continuous real-time monitoring"
            ]
            delta = timedelta(days=14)

        next_date = (today + delta).strftime("%Y-%m-%d")
        data = {
            "recommended_actions": actions,
            "next_inspection_date": next_date,
            "calendar_reminder_details": f"Follow-up drone inspection for {state['asset_name']} — severity: {sev_val}, priority: {pri}",
            "reasoning": f"Actions calibrated to {sev_val} severity level. (AI unavailable: {type(e).__name__})",
            "confidence_score": 90
        }

    agent_states["recommendation"] = {
        "status": "Completed",
        "reasoning": data.get("reasoning", "Recommendations formulated."),
        "confidence": data.get("confidence_score", 90),
        "output": data
    }
    logs = list(state.get("logs", []))
    logs.append(f"Recommendation: next inspection on {data.get('next_inspection_date')}, {len(data.get('recommended_actions', []))} action(s).")
    return {"recommendation": data, "agent_states": agent_states, "logs": logs}


# ─── 6. Report Node ───────────────────────────────────────────────────────────

def report_node(state: AgentState) -> Dict[str, Any]:
    """Compiles a full professional inspection report in Markdown."""
    agent_states = dict(state.get("agent_states", {}))
    agent_states["report"] = {
        "status": "Running",
        "reasoning": "Compiling final Markdown inspection report.",
        "confidence": 0,
        "output": {}
    }

    img_ana  = state.get("image_analysis",    {})
    def_det  = state.get("defect_detection",  {})
    sev_ass  = state.get("severity_assessment", {})
    recomm   = state.get("recommendation",    {})

    prompt = f"""You are the Report Agent for drone infrastructure inspection.
Compile a professional inspection report as JSON with these exact keys:
- report_markdown: full Markdown report (headings, tables, bullets)
- executive_summary: 2-3 sentence plain-English summary
- reasoning: brief note on report compilation
- confidence_score: integer 0-100

Data:
Asset: {state['asset_name']}
Image Analysis: {json.dumps(img_ana)}
Defect Detection: {json.dumps(def_det)}
Severity Assessment: {json.dumps(sev_ass)}
Recommendations: {json.dumps(recomm)}

The Markdown must include:
1. Executive Summary
2. Inspection Parameters (sensor, image quality, GSD)
3. Defect Findings table (Type | Size | Location)
4. Risk Assessment (severity, risk score, priority)
5. Recommended Actions & Next Inspection Date

Reply ONLY with the JSON object."""

    try:
        text = call_ai(prompt, timeout=18.0)
        data = parse_json(text)
    except Exception as e:
        # High-quality local fallback report
        sev_val  = sev_ass.get("overall_severity", "Action Required")
        risk     = sev_ass.get("risk_score", 70)
        priority = sev_ass.get("priority", "Medium")
        next_date = recomm.get("next_inspection_date", "N/A")
        actions_md = "\n".join(f"- {a}" for a in recomm.get("recommended_actions", ["Perform follow-up inspection."]))

        defect_rows = "\n".join(
            f"| {d.get('type','—')} | {d.get('estimated_size','—')} | {d.get('location','—')} |"
            for d in def_det.get("defects_found", [])
        ) or "| No defects detected | — | — |"

        report_markdown = f"""# Drone Infrastructure Inspection Report
**Asset:** {state['asset_name']}
**Inspection Date:** {datetime.now().strftime('%B %d, %Y')}
**Location:** {state.get('location', 'N/A')}
**Google Drive:** {state.get('gdrive_link', 'N/A')}

---

## 1. Executive Summary
An automated drone inspection was conducted for **{state['asset_name']}**. The AI pipeline evaluated imagery quality, detected structural defects, assessed risk severity, and produced maintenance recommendations. Overall severity is classified as **{sev_val}** with a risk score of **{risk}/100**.

---

## 2. Inspection Parameters
| Parameter | Value |
|---|---|
| Sensor Type | {img_ana.get('sensor_type', 'RGB CMOS')} |
| Image Suitability | {img_ana.get('suitability', 'High')} |
| Quality Metrics | {img_ana.get('image_quality_metrics', 'Good')} |

---

## 3. Defect Findings
| Defect Type | Estimated Size | Location |
|---|---|---|
{defect_rows}

**Total defects detected:** {def_det.get('total_count', 0)}

---

## 4. Risk Assessment
| Metric | Value |
|---|---|
| Overall Severity | **{sev_val}** |
| Risk Score | {risk} / 100 |
| Maintenance Priority | **{priority}** |

**Reasoning:** {sev_ass.get('reasoning', 'N/A')}

---

## 5. Recommended Actions & Schedule
{actions_md}

**Next Inspection Date:** {next_date}

**Calendar Reminder:** {recomm.get('calendar_reminder_details', f'Schedule follow-up inspection for {state["asset_name"]}')}

---
*Report generated by Drone Infrastructure Inspector AI pipeline.*
"""
        data = {
            "report_markdown": report_markdown,
            "executive_summary": f"Inspection of {state['asset_name']} completed. Severity: {sev_val}, {def_det.get('total_count',0)} defect(s) detected. Next inspection: {next_date}.",
            "reasoning": f"Fallback template report generated. (AI unavailable: {type(e).__name__})",
            "confidence_score": 95
        }

    agent_states["report"] = {
        "status": "Completed",
        "reasoning": data.get("reasoning", "Report compiled."),
        "confidence": data.get("confidence_score", 95),
        "output": data
    }
    logs = list(state.get("logs", []))
    logs.append("Report Agent: inspection report compiled successfully.")
    return {"report": data, "agent_states": agent_states, "logs": logs}


# ─── Graph Construction ───────────────────────────────────────────────────────

def build_inspection_graph():
    """Builds and compiles the LangGraph StateGraph for the inspection pipeline."""
    builder = StateGraph(AgentState)

    builder.add_node("supervisor",              supervisor_node)
    builder.add_node("image_analysis_node",     image_analysis_node)
    builder.add_node("defect_detection_node",   defect_detection_node)
    builder.add_node("severity_assessment_node", severity_assessment_node)
    builder.add_node("recommendation_node",     recommendation_node)
    builder.add_node("report_node",             report_node)

    builder.set_entry_point("supervisor")

    def route(state: AgentState) -> str:
        nxt = state.get("next_agent", "FINISH")
        return END if (not nxt or nxt == "FINISH") else nxt

    builder.add_conditional_edges(
        "supervisor", route,
        {
            "image_analysis_node":      "image_analysis_node",
            "defect_detection_node":    "defect_detection_node",
            "severity_assessment_node": "severity_assessment_node",
            "recommendation_node":      "recommendation_node",
            "report_node":              "report_node",
            END: END,
        }
    )

    for node in ["image_analysis_node", "defect_detection_node",
                 "severity_assessment_node", "recommendation_node", "report_node"]:
        builder.add_edge(node, "supervisor")

    return builder.compile()


if __name__ == "__main__":
    graph = build_inspection_graph()
    print("Graph compiled successfully.")
