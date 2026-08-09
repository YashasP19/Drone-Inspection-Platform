import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, ExternalLink, Play, Upload, Calendar, FileText,
  Loader2, CheckCircle2, Clock3, XCircle, Zap, Eye, Shield,
  BarChart3, Wrench, FileCheck, ChevronRight, AlertTriangle,
  Activity, Cpu, Layers, ScanEye, Brain, ClipboardList, Trash2,
  FolderOpen
} from "lucide-react";
import InteractiveViewer, { type DetectionBox } from "./InteractiveViewer";

function mapSeverity(overallSeverity?: string): DetectionBox["severity"] {
  switch (overallSeverity) {
    case "High": return "High";
    case "Action Required": return "Action Required";
    case "Minor": return "Low";
    default: return "Moderate";
  }
}

// One generous box per defect category (not per instance) — mirrors how the hero section
// shows a single box covering "the crack area" rather than a tiny box per crack, since we
// don't have real per-pixel coordinates without a trained YOLO model.


interface Asset {
  id: string;
  name: string;
  infrastructureType: string;
  location: string;
  thumbnail: string;
  inspectionPageId: string;
  gDriveLink?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InspectionsViewProps {
  inspectedAsset?: Asset | null;
  onClearAsset?: () => void;
  onSelectAsset?: (asset: Asset) => void;
}

interface AgentState {
  status: "Waiting" | "Running" | "Completed" | "Failed";
  reasoning: string;
  confidence: number;
  output: any;
}

interface InspectionRunState {
  image_analysis: AgentState;
  defect_detection: AgentState;
  severity_assessment: AgentState;
  recommendation: AgentState;
  report: AgentState;
}

const AGENTS = [
  {
    id: "image_analysis",
    name: "Image Analysis",
    short: "Analyzing imagery quality, GSD & sensor metadata",
    icon: ScanEye,
    color: "blue",
  },
  {
    id: "defect_detection",
    name: "Defect Detection",
    short: "Scanning for cracks, spalling, corrosion & anomalies",
    icon: Eye,
    color: "purple",
  },
  {
    id: "severity_assessment",
    name: "Severity Assessment",
    short: "Grading structural risk & priority classification",
    icon: Shield,
    color: "orange",
  },
  {
    id: "recommendation",
    name: "Recommendation",
    short: "Generating corrective actions & inspection schedule",
    icon: Wrench,
    color: "yellow",
  },
  {
    id: "report",
    name: "Report Compilation",
    short: "Compiling final structured inspection report",
    icon: FileCheck,
    color: "emerald",
  },
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  None:             { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  Minor:            { color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  dot: "bg-yellow-400"  },
  "Action Required":{ color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  dot: "bg-orange-400"  },
  High:             { color: "text-red-400",      bg: "bg-red-500/10",     border: "border-red-500/30",     dot: "bg-red-400"     },
};

// Tailwind's JIT scanner only picks up class names that appear literally in
// source — `border-${color}-500/30`-style interpolation silently produces no
// CSS at all, so every one of these needs to be a static, fully-spelled key.
const AGENT_COLORS: Record<string, { gradientFrom: string; border: string; text: string; bgSoft: string }> = {
  blue:    { gradientFrom: "from-blue-500/20",    border: "border-blue-500/30",    text: "text-blue-400",    bgSoft: "bg-blue-500/20" },
  purple:  { gradientFrom: "from-purple-500/20",  border: "border-purple-500/30",  text: "text-purple-400",  bgSoft: "bg-purple-500/20" },
  orange:  { gradientFrom: "from-orange-500/20",  border: "border-orange-500/30",  text: "text-orange-400",  bgSoft: "bg-orange-500/20" },
  yellow:  { gradientFrom: "from-yellow-500/20",  border: "border-yellow-500/30",  text: "text-yellow-400",  bgSoft: "bg-yellow-500/20" },
  emerald: { gradientFrom: "from-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400", bgSoft: "bg-emerald-500/20" },
};

const STATUS_ICON = {
  Waiting:   <Clock3 className="w-3.5 h-3.5 text-gray-500" />,
  Running:   <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  Completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  Failed:    <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

const initPipeline = (): InspectionRunState => ({
  image_analysis:    { status: "Waiting", reasoning: "Waiting for sensor analysis...",      confidence: 0, output: null },
  defect_detection:  { status: "Waiting", reasoning: "Waiting for defect scan...",          confidence: 0, output: null },
  severity_assessment:{ status: "Waiting", reasoning: "Waiting for risk assessment...",     confidence: 0, output: null },
  recommendation:    { status: "Waiting", reasoning: "Waiting for action planning...",      confidence: 0, output: null },
  report:            { status: "Waiting", reasoning: "Waiting for report compilation...",   confidence: 0, output: null },
});

export default function InspectionsView({ inspectedAsset, onClearAsset, onSelectAsset }: InspectionsViewProps) {
  const [generalChecklist, setGeneralChecklist] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importingFromDrive, setImportingFromDrive] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [pipelineState, setPipelineState] = useState<InspectionRunState>(initPipeline());
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "report" | "defects">("pipeline");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [ranWithoutImages, setRanWithoutImages] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [hasRunOnce, setHasRunOnce] = useState(false);
  const [yoloCrackDetections, setYoloCrackDetections] = useState<DetectionBox[] | null>(null);
  const [yoloDetecting, setYoloDetecting] = useState(false);
  const [driveImportCount, setDriveImportCount] = useState<number | null>(null);
  const hasTriggeredRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const activeAgentRef = useRef<string>("");

  // Manual Inspection modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDefectType, setManualDefectType] = useState("Concrete Crack");
  const [manualLocation, setManualLocation] = useState("Section A - Elevation 12m");
  const [manualSeverity, setManualSeverity] = useState("Action Required");
  const [manualSize, setManualSize] = useState("12mm x 45mm");
  const [manualNotes, setManualNotes] = useState("");
  const [manualImages, setManualImages] = useState<string[]>([]);
  const [manualUploading, setManualUploading] = useState(false);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [pickerAssetId, setPickerAssetId] = useState("");

  const completedCount = Object.values(pipelineState).filter(s => s.status === "Completed").length;
  const progressPct = Math.round((completedCount / 5) * 100);

  const fetchInspections = async () => {
    try {
      setLoadingList(true);
      const res = await fetch("http://localhost:5001/api/inspections");
      const data = await res.json();
      setGeneralChecklist(data);
    } catch { } finally { setLoadingList(false); }
  };

  const handleDeleteInspection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inspection record?")) return;
    try {
      await fetch(`http://localhost:5001/api/inspections/${id}`, { method: "DELETE" });
      fetchInspections();
    } catch (err) {
      console.error("Error deleting inspection:", err);
    }
  };

  const handleClearAllInspections = async () => {
    if (!confirm("Are you sure you want to clear ALL inspection records? This action cannot be undone.")) return;
    try {
      await fetch("http://localhost:5001/api/inspections", { method: "DELETE" });
      setGeneralChecklist([]);
    } catch (err) {
      console.error("Error clearing inspections:", err);
    }
  };

  const handleCloseManualModal = () => {
    setIsManualModalOpen(false);
    setManualImages([]);
  };

  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setManualUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    try {
      const res = await fetch("http://localhost:5001/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (data.urls) setManualImages(prev => [...prev, ...data.urls]);
    } catch (err) {
      console.error("Error uploading manual inspection images:", err);
    } finally {
      setManualUploading(false);
    }
  };

  const handleSaveManualInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAsset = inspectedAsset;
    if (!targetAsset) return;

    const manualDefects = [
      {
        type: manualDefectType,
        location: manualLocation,
        estimated_size: manualSize,
        notes: manualNotes
      }
    ];

    const agentStates = {
      image_analysis: { status: "Completed", reasoning: "Manual inspector visual validation complete.", confidence: 100, output: { sensor_type: "Manual Inspection", suitability: "Passed", image_quality_metrics: "Inspector verified on-site imagery", uploaded_images: manualImages } },
      defect_detection: { status: "Completed", reasoning: "Manual defect entry logged by inspector.", confidence: 100, output: { total_count: manualDefects.length, defects_found: manualDefects } },
      severity_assessment: { status: "Completed", reasoning: `Manual severity classified as ${manualSeverity}.`, confidence: 100, output: { overall_severity: manualSeverity, risk_score: manualSeverity === "High" ? 85 : manualSeverity === "Action Required" ? 65 : 30, priority: manualSeverity === "High" ? "Immediate" : "Scheduled" } },
      recommendation: { status: "Completed", reasoning: "Manual action plan registered.", confidence: 100, output: { recommended_actions: [manualNotes || "Perform field maintenance and verification scan."], next_inspection_date: "2026-10-15" } },
      report: { status: "Completed", reasoning: "Manual inspection summary compiled.", confidence: 100, output: { executive_summary: `Manual inspection recorded for ${targetAsset.name} with ${manualSeverity} severity.` } }
    };

    const reportMarkdown = `# Manual Structural Inspection Report
**Asset**: ${targetAsset.name}
**Date**: ${new Date().toLocaleDateString()}
**Severity**: ${manualSeverity}

## Manual Defect Log
- **Type**: ${manualDefectType}
- **Location**: ${manualLocation}
- **Size**: ${manualSize}
- **Inspector Notes**: ${manualNotes || "Field inspector verified on-site structural condition."}
${manualImages.length > 0 ? `\n## Uploaded Images\n${manualImages.map(u => `- ${u}`).join("\n")}` : ""}
`;

    try {
      const res = await fetch("http://localhost:5001/api/inspections/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: targetAsset.id,
          agentStates,
          reportMarkdown,
          severity: manualSeverity,
          nextInspectionDate: "2026-10-15"
        })
      });

      if (res.ok) {
        setFinalReport({
          reportMarkdown,
          severity: manualSeverity,
          nextInspectionDate: "2026-10-15",
          calendarReminderDetails: manualNotes || "Follow-up manual inspection scan"
        });
        setPipelineState({
          image_analysis: { status: "Completed", reasoning: "Manual inspection visual verification.", confidence: 100, output: agentStates.image_analysis.output },
          defect_detection: { status: "Completed", reasoning: "Manual defect logged.", confidence: 100, output: agentStates.defect_detection.output },
          severity_assessment: { status: "Completed", reasoning: `Severity: ${manualSeverity}`, confidence: 100, output: agentStates.severity_assessment.output },
          recommendation: { status: "Completed", reasoning: "Manual recommendation.", confidence: 100, output: agentStates.recommendation.output },
          report: { status: "Completed", reasoning: "Manual report compiled.", confidence: 100, output: agentStates.report.output }
        });
        setActiveTab("report");
        setLogs((prev) => [...prev, "✔ Manual inspection logged and saved successfully!"]);
        setManualImages([]);
        fetchInspections();
      }
    } catch (err) {
      console.error("Error saving manual inspection:", err);
    } finally {
      setIsManualModalOpen(false);
    }
  };


  useEffect(() => {
    if (!inspectedAsset) {
      fetchInspections();
      fetch("http://localhost:5001/assets")
        .then(res => res.json())
        .then(data => setAllAssets(data))
        .catch(err => console.error("Error fetching assets:", err));
    }
  }, [inspectedAsset]);

  // Intentionally does NOT auto-run the pipeline on open: it used to fire
  // immediately on mount, before the user had any chance to upload real
  // drone photos, so the very first run always analyzed zero images and
  // fell back to heuristic output. Now the user must upload images (or
  // knowingly skip that) and press "Start AI Inspection" themselves.
  useEffect(() => {
    hasTriggeredRef.current = false;
    setUploadedImages([]);
    setHasRunOnce(false);
    setDriveImportCount(null);
  }, [inspectedAsset]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    try {
      const res = await fetch("http://localhost:5001/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (data.urls) {
        setUploadedImages(prev => [...prev, ...data.urls]);
        setLogs(prev => [...prev, `↑ Uploaded ${files.length} raw drone image(s) manually.`]);
      }
    } catch { setLogs(prev => [...prev, "✕ Error uploading images."]); }
    finally { setUploading(false); }
  };

  const handleImportFromDrive = async () => {
    if (!inspectedAsset?.gDriveLink) return;
    setImportingFromDrive(true);
    try {
      const res = await fetch(`http://localhost:5001/api/gdrive-images?link=${encodeURIComponent(inspectedAsset.gDriveLink)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import from Google Drive");
      const urls = (data.images || []).map((f: { url: string }) => f.url);
      if (urls.length === 0) {
        setLogs(prev => [...prev, "⚠ No images found in the linked Google Drive folder (make sure it's shared as 'Anyone with the link can view')."]);
      } else {
        setUploadedImages(prev => [...prev, ...urls]);
        setDriveImportCount(urls.length);
        setLogs(prev => [...prev, `↑ Imported ${urls.length} image(s) from Google Drive folder.`]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `✕ Google Drive import failed: ${err.message}`]);
    } finally {
      setImportingFromDrive(false);
    }
  };

  const updateAgentRunning = (agentId: string) => {
    setPipelineState(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId as keyof InspectionRunState], status: "Running" }
    }));
    activeAgentRef.current = agentId;
  };

  const runAutomatedInspection = async (manualUrls: string[]) => {
    if (!inspectedAsset) return;

    const imagesToSend = manualUrls.length > 0 ? manualUrls : uploadedImages;
    if (imagesToSend.length === 0) {
      setPipelineError("Upload a drone image before starting the inspection pipeline.");
      return;
    }

    setHasRunOnce(true);
    setIsRunning(true);
    setFinalReport(null);
    setPipelineError(null);
    setActiveTab("pipeline");
    activeAgentRef.current = "";
    setPipelineState(initPipeline());
    setLogs(["⚡ Supervisor Agent initialized. Orchestrating AI pipeline..."]);
    setRanWithoutImages(false);
    setYoloCrackDetections(null);

    try {
      const res = await fetch("http://localhost:5001/api/inspections/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: inspectedAsset.id,
          images: imagesToSend
        })
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const update = JSON.parse(line.trim());

            if (update.event === "init") {
              setLogs(prev => [...prev, "🧠 LangGraph compiled. Routing to first agent node..."]);
            } else if (update.event === "node_complete") {
              const { node, state } = update;

              // Push latest log from pipeline
              if (state.logs?.length > 0) {
                const latest = state.logs[state.logs.length - 1];
                setLogs(prev => prev.includes(latest) ? prev : [...prev, `• ${latest}`]);
              }

              // Show next node as running
              if (state.next_agent && state.next_agent !== "FINISH") {
                updateAgentRunning(state.next_agent.replace("_node", ""));
              }

              // Update completed agent state
              const agentKey = node.replace("_node", "") as keyof InspectionRunState;
              if (state.agent_states?.[agentKey] && state[agentKey]) {
                setPipelineState(prev => ({
                  ...prev,
                  [agentKey]: {
                    status: "Completed",
                    reasoning: state.agent_states[agentKey].reasoning,
                    confidence: state.agent_states[agentKey].confidence,
                    output: state[agentKey]
                  }
                }));
              }
            } else if (update.event === "complete") {
              setLogs(prev => [...prev, "✅ All agents completed. Saving report..."]);
              await saveInspectionResult(update.state);
            } else if (update.event === "error") {
              setLogs(prev => [...prev, `✕ Error: ${update.message}`]);
              setIsRunning(false);
              setPipelineError(update.message || "The AI pipeline failed unexpectedly.");
              const failedAgent = (activeAgentRef.current || "image_analysis") as keyof InspectionRunState;
              setPipelineState(prev => ({
                ...prev,
                [failedAgent]: { ...prev[failedAgent], status: "Failed", reasoning: update.message || prev[failedAgent].reasoning }
              }));
            }
          } catch (e) { /* skip bad JSON */ }
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `✕ Pipeline failed: ${err.message}`]);
      setIsRunning(false);
      setPipelineError(err.message || "The AI pipeline failed unexpectedly.");
    }
  };

  const saveInspectionResult = async (finalState: any) => {
    if (!inspectedAsset) return;
    const severity = finalState.severity_assessment?.overall_severity || "None";
    const reportMarkdown = finalState.report?.report_markdown || "";
    const nextInspectionDate = finalState.recommendation?.next_inspection_date || "2026-12-31";
    try {
      const res = await fetch("http://localhost:5001/api/inspections/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: inspectedAsset.id,
          agentStates: finalState.agent_states,
          reportMarkdown, severity, nextInspectionDate
        })
      });
      if (res.ok) {
        setFinalReport({ reportMarkdown, severity, nextInspectionDate, calendarReminderDetails: finalState.recommendation?.calendar_reminder_details || "" });
        setActiveTab("report");
        setLogs(prev => [...prev, "🎉 Report saved and available in Reports tab!"]);
        runCrackDetection(severity);
      }
    } catch { }
    finally { setIsRunning(false); activeAgentRef.current = ""; }
  };

  // Runs the real pretrained YOLO crack model on the uploaded image, independently of the
  // LLM-based agent pipeline above. Fires after the inspection is saved so it never blocks
  // /api/inspections/stream; the spatial preview swaps in these real boxes once they arrive.
  const runCrackDetection = async (overallSeverity: string) => {
    if (uploadedImages.length === 0) return;
    setYoloDetecting(true);
    try {
      const res = await fetch("http://localhost:5001/api/inspections/detect-crack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedImages[0] })
      });
      if (!res.ok) throw new Error(await res.text());
      const { detections } = await res.json();
      const boxes: DetectionBox[] = (detections || []).map((d: any, i: number) => ({
        id: `yolo-${i}`,
        label: d.label,
        type: "CRACK",
        confidence: d.confidence,
        severity: mapSeverity(overallSeverity),
        x: `${d.x_pct}%`,
        y: `${d.y_pct}%`,
        width: `${d.width_pct}%`,
        height: `${d.height_pct}%`,
      }));
      // Only use real YOLO boxes if we have confident detections; otherwise keep hash fallback
      setYoloCrackDetections(boxes.length > 0 ? boxes : null);
    } catch {
      setYoloCrackDetections(null);
    } finally {
      setYoloDetecting(false);
    }
  };

  const getCalendarUrl = (report: any) => {
    if (!inspectedAsset || !report) return "#";
    const title = `Drone Inspection — ${inspectedAsset.name}`;
    const dateStr = (report.nextInspectionDate || "2026-10-31").replace(/-/g, "");
    const dates = `${dateStr}T090000/${dateStr}T100000`;
    const details = `Auto-generated follow-up.\n\n${report.calendarReminderDetails || "Perform routine drone capture scan"}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
  };

  // ─────────────────────────────────────────────────────
  // VIEW 1 — ACTIVE INSPECTION WORKSPACE
  // ─────────────────────────────────────────────────────
  if (inspectedAsset) {
    const sev = pipelineState.severity_assessment.output?.overall_severity || "";
    const sevCfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG["None"];
    const defects = pipelineState.defect_detection.output?.defects_found || [];
    const totalDefects = pipelineState.defect_detection.output?.total_count || 0;
    const recommendation = pipelineState.recommendation.output || null;
    const imageAnalysis = pipelineState.image_analysis.output || null;

    return (
      <div className="flex flex-col gap-0 text-left pb-16 min-h-screen">

        {/* ── Header Bar ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClearAsset}
              className="p-2 bg-white/70 border border-white/80 rounded-xl hover:bg-white text-[#1E1235] transition-all backdrop-blur-2xl shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1E1235]">{inspectedAsset.name}</h2>
                {isRunning ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/25 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-ping" />
                    AI Running
                  </span>
                ) : finalReport ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                    <CheckCircle2 className="w-3 h-3" />
                    Complete
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 text-[#5B4B7C] border border-white/80">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#5B4B7C] mt-0.5">
                {inspectedAsset.infrastructureType} • {inspectedAsset.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inspectedAsset.gDriveLink && (
              <a
                href={inspectedAsset.gDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/70 border border-white/80 rounded-xl text-xs font-medium text-[#1E1235] hover:bg-white transition-all backdrop-blur-2xl shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GDrive
              </a>
            )}
            <button
              onClick={() => setIsManualModalOpen(true)}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/70 hover:bg-white border border-white/90 rounded-xl text-xs font-bold text-[#1E1235] hover:text-[#6D28D9] transition-all shadow-sm backdrop-blur-md"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Manual Inspection</span>
            </button>
            <button
              onClick={() => runAutomatedInspection([])}
              disabled={isRunning || uploading || uploadedImages.length === 0}
              title={uploadedImages.length === 0 ? "Upload a drone image first" : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                isRunning
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 cursor-not-allowed"
                  : uploadedImages.length === 0
                  ? "bg-white/30 text-black/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-white shadow-white/10"
              }`}
            >
              {isRunning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running AI...</>
                : hasRunOnce
                ? <><Zap className="w-3.5 h-3.5 fill-current" /> Re-run Inspection</>
                : <><Play className="w-3.5 h-3.5 fill-current" /> Start AI Inspection</>
              }
            </button>
          </div>

        </div>

        {/* ── Pipeline error banner ── */}
        {pipelineError && !isRunning && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 backdrop-blur-2xl shadow-sm">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-600">Inspection pipeline failed</p>
              <p className="text-xs text-red-700/80 leading-relaxed mt-0.5">{pipelineError}</p>
            </div>
          </div>
        )}

        {/* ── No-real-images warning ── */}
        {ranWithoutImages && (isRunning || finalReport) && (
          <div className="mb-5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 backdrop-blur-2xl shadow-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800/90 leading-relaxed">
              <span className="font-bold">No drone images were uploaded</span> for this run. The Image Analysis
              and Defect Detection agents could not visually inspect real imagery and fell back to non-visual
              heuristic output — treat these results as a placeholder, not a real inspection. Upload actual
              drone photos below and re-run for a genuine analysis.
            </p>
          </div>
        )}

        {/* ── Progress Header ── */}
        {(isRunning || finalReport) && (
          <div className="mb-5 bg-white/70 border border-white/80 rounded-3xl p-5 overflow-hidden relative backdrop-blur-2xl shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5" />
            <div className="relative flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#6D28D9]" />
                <span className="text-xs font-extrabold text-[#1E1235]">AI Pipeline Progress</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#6D28D9]">{progressPct}%</span>
            </div>
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="relative flex justify-between mt-2">
              {AGENTS.map((a) => (
                <div key={a.id} className="flex flex-col items-center gap-1">
                  <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    pipelineState[a.id as keyof InspectionRunState].status === "Completed" ? "bg-emerald-400 shadow-emerald-400/50 shadow-sm" :
                    pipelineState[a.id as keyof InspectionRunState].status === "Running" ? "bg-blue-400 animate-pulse" :
                    "bg-white/10"
                  }`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Layout Grid ── */}
        <div className="grid lg:grid-cols-12 gap-5">

          {/* ── LEFT COLUMN (8) ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/70 border border-white/80 rounded-xl backdrop-blur-2xl shadow-sm">
              {(["pipeline", "defects", "report"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold capitalize transition-all ${
                    activeTab === tab
                      ? "bg-white text-[#1E1235] shadow"
                      : "text-[#5B4B7C] hover:text-[#1E1235]"
                  }`}
                >
                  {tab === "pipeline" && <Cpu className="w-3.5 h-3.5" />}
                  {tab === "defects" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {tab === "report" && <FileText className="w-3.5 h-3.5" />}
                  {tab === "pipeline" ? "AI Pipeline" : tab === "defects" ? `Defects${totalDefects > 0 ? ` (${totalDefects})` : ""}` : "Report"}
                </button>
              ))}
            </div>

            {/* ─── PIPELINE TAB ─── */}
            {activeTab === "pipeline" && (
              <div className="space-y-3">
                {!hasRunOnce && !isRunning && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5 flex items-start gap-2.5 backdrop-blur-2xl shadow-sm">
                    <Upload className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#1E1235]/80 leading-relaxed">
                      Upload real drone photos below first, then click <span className="font-bold">Start AI Inspection</span> above
                      so the Image Analysis and Defect Detection agents can analyze actual imagery instead of falling back to
                      generic heuristic output.
                    </p>
                  </div>
                )}
                {AGENTS.map((agent, idx) => {
                  const st = pipelineState[agent.id as keyof InspectionRunState];
                  // Derived purely from st.status (not activeAgent) so a Failed
                  // node stops rendering as "Running"/spinning once it fails —
                  // activeAgent isn't reliably cleared on failure/completion.
                  const isActive = st.status === "Running";
                  const colors = AGENT_COLORS[agent.color];
                  const Icon = agent.icon;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                      className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-2xl shadow-sm ${
                        isActive
                          ? `bg-gradient-to-r ${colors.gradientFrom} ${colors.border} shadow-lg`
                          : st.status === "Completed"
                          ? "bg-white/70 border-white/80 hover:border-white"
                          : "bg-white/60 border-white/70 hover:border-white/90"
                      }`}
                    >
                      {/* Animated shine for running */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      )}

                      <div className="relative p-4 flex items-center gap-4">
                        {/* Step number */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          st.status === "Completed" ? "bg-emerald-500/10 border-emerald-500/30" :
                          isActive ? "bg-blue-500/20 border-blue-500/40" :
                          "bg-white/50 border-white/70"
                        }`}>
                          {st.status === "Completed"
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            : isActive
                            ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            : <span className="text-[11px] font-bold text-[#5B4B7C]">{idx + 1}</span>
                          }
                        </div>

                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${isActive ? colors.bgSoft : "bg-white/50"}`}>
                          <Icon className={`w-4 h-4 ${isActive || st.status === "Completed" ? colors.text : "text-[#5B4B7C]"}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${
                              isActive || st.status === "Completed" ? "text-[#1E1235]" : "text-[#5B4B7C]"
                            }`}>{agent.name}</span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                              st.status === "Completed" ? "bg-emerald-500/10 text-emerald-600" :
                              isActive ? "bg-blue-500/10 text-blue-600 animate-pulse" :
                              "bg-white/50 text-[#5B4B7C]"
                            }`}>{st.status}</span>
                          </div>
                          <p className="text-[10px] text-[#5B4B7C] mt-0.5 truncate">{agent.short}</p>
                          {st.status !== "Waiting" && (
                            <p className="text-[10px] text-[#1E1235]/70 mt-1.5 leading-relaxed line-clamp-2">{st.reasoning}</p>
                          )}
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {st.confidence > 0 && (
                            <div className="text-right">
                              <span className="text-[9px] text-[#5B4B7C] block font-semibold uppercase">Confidence</span>
                              <span className={`text-sm font-black font-mono ${colors.text}`}>{st.confidence}%</span>
                            </div>
                          )}
                          {st.status !== "Waiting" && (
                            <ChevronRight className={`w-3.5 h-3.5 text-[#5B4B7C] transition-transform ${expandedAgent === agent.id ? "rotate-90" : ""}`} />
                          )}
                        </div>
                      </div>

                      {/* Expanded output */}
                      {expandedAgent === agent.id && st.output && (
                        <div className="border-t border-white/60 mx-4 mb-4 pt-3">
                          <div className="bg-[#100A1F] rounded-xl p-3 font-mono text-[10px] text-emerald-300 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            <span className="text-gray-500 block mb-1">Agent Output JSON</span>
                            {JSON.stringify(st.output, null, 2)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Upload section */}
                <div className="bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold text-[#5B4B7C] uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      Manual Image Upload
                    </h3>
                    {inspectedAsset?.gDriveLink && (
                      <button
                        onClick={handleImportFromDrive}
                        disabled={isRunning || importingFromDrive}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 border border-white/80 rounded-lg text-[10px] font-bold text-[#6D28D9] hover:bg-white transition-all shadow-sm disabled:opacity-50"
                      >
                        {importingFromDrive
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <FolderOpen className="w-3 h-3" />
                        }
                        Import from Drive
                      </button>
                    )}
                  </div>
                  {driveImportCount !== null && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-emerald-700 truncate">
                        Drive folder selected — {driveImportCount} image(s) imported from{" "}
                        <span className="font-mono underline">{inspectedAsset?.gDriveLink}</span>
                      </span>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-white/90 bg-white/40 rounded-xl p-5 flex flex-col items-center justify-center hover:border-[#8B5CF6]/40 transition-all relative group">
                    <input
                      type="file" multiple accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isRunning || uploading}
                    />
                    {uploading
                      ? <Loader2 className="w-6 h-6 text-[#6D28D9] mb-2 animate-spin" />
                      : <Upload className="w-6 h-6 text-[#5B4B7C] mb-2 group-hover:text-[#6D28D9] transition-all" />
                    }
                    <span className="text-xs text-[#1E1235] font-medium">Click or drag drone images here</span>
                    <span className="text-[10px] text-[#5B4B7C] mt-1">JPEG, PNG — max 10MB each</span>
                  </div>
                  {uploadedImages.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {uploadedImages.map((img, i) => (
                        <div key={i} className="w-14 h-14 rounded-lg border border-white/80 overflow-hidden bg-white/50">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── DEFECTS TAB ─── */}
            {activeTab === "defects" && (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block">Total Defects</span>
                    <span className="text-3xl font-black text-[#1E1235] mt-1 block">{totalDefects}</span>
                    <span className="text-[10px] text-[#5B4B7C] mt-0.5 block">Identified anomalies</span>
                  </div>
                  <div className={`border rounded-2xl p-4 backdrop-blur-2xl shadow-sm ${sev ? `${sevCfg.bg} ${sevCfg.border}` : "bg-white/70 border-white/80"}`}>
                    <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block">Severity</span>
                    <span className={`text-xl font-black mt-1 block ${sev ? sevCfg.color : "text-[#5B4B7C]"}`}>{sev || "—"}</span>
                    <span className="text-[10px] text-[#5B4B7C] mt-0.5 block">Overall risk grade</span>
                  </div>
                  <div className="bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block">Risk Score</span>
                    <span className="text-3xl font-black text-[#1E1235] mt-1 block">
                      {pipelineState.severity_assessment.output?.risk_score ?? "—"}
                    </span>
                    <span className="text-[10px] text-[#5B4B7C] mt-0.5 block">Out of 100</span>
                  </div>
                </div>

                {/* Defect list */}
                <div className="bg-white/70 border border-white/80 rounded-2xl overflow-hidden backdrop-blur-2xl shadow-sm">
                  <div className="p-3 border-b border-white/80 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-[#1E1235]">Detected Anomalies</span>
                  </div>
                  {defects.length === 0 ? (
                    <div className="p-8 text-center">
                      {pipelineState.defect_detection.status === "Completed"
                        ? <p className="text-xs text-emerald-600">No structural defects detected ✓</p>
                        : pipelineState.defect_detection.status === "Running"
                        ? <p className="text-xs text-blue-600">Scanning imagery for defects...</p>
                        : pipelineState.defect_detection.status === "Failed"
                        ? <p className="text-xs text-red-600">Defect scan failed — see logs</p>
                        : <p className="text-xs text-[#5B4B7C]">Run inspection to detect defects</p>
                      }
                    </div>
                  ) : (
                    <div className="divide-y divide-white/60">
                      {defects.map((d: any, i: number) => (
                        <div key={i} className="p-4 flex items-start gap-3 hover:bg-white/40 transition-colors">
                          <div className="mt-0.5 w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-[#1E1235] block">{d.type}</span>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              <span className="text-[10px] text-[#5B4B7C]">📍 {d.location}</span>
                              <span className="text-[10px] text-[#5B4B7C]">📐 {d.estimated_size}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 border border-orange-500/20 flex-shrink-0">
                            {pipelineState.severity_assessment.output?.overall_severity || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended actions */}
                {recommendation?.recommended_actions?.length > 0 && (
                  <div className="bg-white/70 border border-white/80 rounded-2xl overflow-hidden backdrop-blur-2xl shadow-sm">
                    <div className="p-3 border-b border-white/80 flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-yellow-600" />
                      <span className="text-xs font-bold text-[#1E1235]">Recommended Actions</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {recommendation.recommended_actions.map((a: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-xs text-[#1E1235]/80 leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image analysis */}
                {imageAnalysis && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                      <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block mb-1">Sensor Type</span>
                      <span className="text-xs font-bold text-[#1E1235]">{imageAnalysis.sensor_type}</span>
                    </div>
                    <div className="bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                      <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block mb-1">Image Suitability</span>
                      <span className="text-xs font-bold text-emerald-600">{imageAnalysis.suitability}</span>
                    </div>
                    <div className="col-span-2 bg-white/70 border border-white/80 rounded-2xl p-4 backdrop-blur-2xl shadow-sm">
                      <span className="text-[10px] font-bold text-[#5B4B7C] uppercase block mb-1">Quality Metrics</span>
                      <span className="text-xs text-[#1E1235]/80">{imageAnalysis.image_quality_metrics}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── REPORT TAB ─── */}
            {activeTab === "report" && (
              <div className="space-y-4">
                {!finalReport ? (
                  <div className="bg-white/70 border border-white/80 rounded-2xl p-12 text-center backdrop-blur-2xl shadow-sm">
                    <FileText className="w-10 h-10 text-[#8B5CF6]/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#1E1235]">No report yet</p>
                    <p className="text-xs text-[#5B4B7C] mt-1">Run the AI inspection to generate a report</p>
                  </div>
                ) : (
                  <>
                    {/* Report header */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-white/70 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3 backdrop-blur-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                          <FileCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#1E1235] block">Inspection Report Generated</span>
                          <span className="text-[10px] text-[#5B4B7C]">{inspectedAsset.name} • {finalReport.nextInspectionDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          SEVERITY_CONFIG[finalReport.severity]?.bg || "bg-gray-500/10"
                        } ${SEVERITY_CONFIG[finalReport.severity]?.color || "text-gray-500"} ${
                          SEVERITY_CONFIG[finalReport.severity]?.border || "border-gray-500/30"
                        } border uppercase`}>
                          {finalReport.severity} Severity
                        </span>
                      </div>
                    </div>

                    {/* Markdown report */}
                    <div className="bg-white/70 border border-white/80 rounded-2xl overflow-hidden backdrop-blur-2xl shadow-sm">
                      <div className="p-3 border-b border-white/80 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#5B4B7C]" />
                        <span className="text-xs font-bold text-[#1E1235]">Full Inspection Report</span>
                      </div>
                      <div className="p-5 font-mono text-[11px] text-emerald-300 max-h-[500px] overflow-y-auto leading-relaxed whitespace-pre-wrap bg-[#100A1F]">
                        {finalReport.reportMarkdown}
                      </div>
                    </div>

                    {/* Calendar CTA */}
                    <div className="bg-gradient-to-r from-purple-500/10 via-white/70 to-white/70 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-2xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <div>
                          <span className="text-xs font-bold text-[#1E1235] block">Next Inspection Reminder</span>
                          <span className="text-[10px] text-[#5B4B7C]">Recommended on <span className="font-mono text-[#1E1235]">{finalReport.nextInspectionDate}</span></span>
                        </div>
                      </div>
                      <a
                        href={getCalendarUrl(finalReport)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Add to Google Calendar
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (4) ── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Live Orchestrator Terminal */}
            <div className="bg-white/70 border border-white/80 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-sm">
              <div className="px-4 py-3 border-b border-white/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-extrabold text-[#1E1235] uppercase tracking-wider">Orchestrator Logs</span>
                </div>
                {isRunning && (
                  <span className="flex items-center gap-1 text-[9px] text-blue-600 font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="bg-[#100A1F] p-3 h-52 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1.5 leading-snug">
                {logs.length === 0 && (
                  <span className="text-gray-600">Waiting for inspection to start...</span>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-gray-600 flex-shrink-0">›</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
                {isRunning && (
                  <div className="flex items-center gap-1.5 text-blue-400 animate-pulse">
                    <span className="text-gray-600">›</span>
                    <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" />
                    <span>Processing...</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Spatial Preview */}
            <div className="bg-white/70 border border-white/80 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-sm">
              <div className="px-4 py-3 border-b border-white/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#6D28D9]" />
                  <span className="text-[10px] font-extrabold text-[#1E1235] uppercase tracking-wider">YOLO Spatial Defect Preview</span>
                </div>
                {yoloDetecting && (
                  <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30 animate-pulse">
                    Running YOLO...
                  </span>
                )}
                {!yoloDetecting && yoloCrackDetections && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    YOLO Verified
                  </span>
                )}
                {!yoloDetecting && !yoloCrackDetections && uploadedImages.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live Photo Bound
                  </span>
                )}
              </div>
              <div className="bg-[#0F091F] relative overflow-hidden p-2">
                <InteractiveViewer
                  inspectedAsset={inspectedAsset}
                  imageUrl={uploadedImages.length > 0 ? uploadedImages[0] : inspectedAsset?.thumbnail}
                  customDetections={yoloCrackDetections ?? undefined}
                />
              </div>
            </div>

            {/* Quick Stats */}
            {finalReport && (
              <div className="bg-white/70 border border-white/80 rounded-3xl p-4 space-y-3 backdrop-blur-2xl shadow-sm">
                <h4 className="text-[10px] font-extrabold text-[#1E1235] uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-[#6D28D9]" />
                  Inspection Summary
                </h4>
                <div className="space-y-2.5">
                  {[
                    { label: "Total Defects", value: String(totalDefects), icon: "🔍" },
                    { label: "Severity", value: finalReport.severity, icon: "⚡" },
                    { label: "Priority", value: pipelineState.severity_assessment.output?.priority || "—", icon: "🎯" },
                    { label: "Next Inspection", value: finalReport.nextInspectionDate, icon: "📅" },
                    { label: "AI Confidence", value: `${pipelineState.report.confidence}%`, icon: "🧠" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[10px] text-[#5B4B7C] flex items-center gap-1.5 font-medium">
                        <span>{icon}</span>{label}
                      </span>
                      <span className="text-[10px] font-bold text-[#1E1235] font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent status mini-grid */}
            <div className="bg-white/70 border border-white/80 rounded-3xl p-4 backdrop-blur-2xl shadow-sm">
              <h4 className="text-[10px] font-extrabold text-[#1E1235] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#6D28D9]" />
                Agent Status
              </h4>
              <div className="space-y-2">
                {AGENTS.map((a) => {
                  const st = pipelineState[a.id as keyof InspectionRunState];
                  const isAct = st.status === "Running";
                  return (
                    <div key={a.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          st.status === "Completed" ? "bg-emerald-500" :
                          isAct ? "bg-blue-500 animate-ping" :
                          "bg-[#5B4B7C]/20"
                        }`} />
                        <span className="text-[10px] text-[#5B4B7C]">{a.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {st.confidence > 0 && (
                          <span className="text-[9px] font-mono text-[#5B4B7C]">{st.confidence}%</span>
                        )}
                        {STATUS_ICON[st.status]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // VIEW 2 — INSPECTION HISTORY LIST
  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1E1235]">Inspections</h2>
          <p className="text-xs text-[#5B4B7C] mt-1 font-medium">
            Click the <span className="text-[#1E1235] font-extrabold">👁 View</span> button on any asset to trigger the AI inspection workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pickerAssetId}
            onChange={(e) => setPickerAssetId(e.target.value)}
            className="px-3 py-2.5 bg-white/70 border border-white/80 rounded-2xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-all backdrop-blur-md shadow-sm"
          >
            <option value="">Select asset...</option>
            {allAssets.map((a) => (
              <option key={a.id} value={a.id}>{a.name} — {a.infrastructureType}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const asset = allAssets.find(a => a.id === pickerAssetId);
              if (!asset || !onSelectAsset) return;
              onSelectAsset(asset);
              setIsManualModalOpen(true);
            }}
            disabled={!pickerAssetId}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl transition-all ${
              pickerAssetId
                ? "bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] text-white shadow-[0_4px_15px_rgba(109,40,217,0.3)] hover:shadow-[0_6px_20px_rgba(109,40,217,0.45)]"
                : "bg-white/50 text-[#5B4B7C]/60 border border-white/60 cursor-not-allowed"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Manual Inspection</span>
          </button>
          {generalChecklist.length > 0 && (
            <button
              onClick={handleClearAllInspections}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/15 hover:bg-red-600 border border-red-500/30 text-red-600 hover:text-white text-xs font-extrabold rounded-2xl transition-all shadow-sm backdrop-blur-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Inspections</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Total Inspections", value: String(generalChecklist.length), icon: ClipboardList, color: "text-[#6D28D9]" },
          { label: "Completed", value: String(generalChecklist.filter(i => i.status === "Passed").length), icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Action Required", value: String(generalChecklist.filter(i => i.severity === "High" || i.severity === "Action Required").length), icon: AlertTriangle, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card-app rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[10px] font-bold text-[#5B4B7C] uppercase">{label}</span>
            </div>
            <span className="text-2xl font-black text-[#1E1235]">{value}</span>
          </div>
        ))}
      </div>

      <div className="glass-card-app rounded-3xl overflow-hidden">
        <div className="p-4 bg-white/40 border-b border-white/60 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#6D28D9]" />
            <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">Inspection History</h3>
          </div>
          <span className="text-[10px] text-[#5B4B7C] font-mono font-bold">{generalChecklist.length} records</span>
        </div>
        <div className="divide-y divide-white/50">
          {loadingList ? (
            <div className="p-8 text-center">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto mb-2" />
              <span className="text-xs text-gray-500">Loading inspection records...</span>
            </div>
          ) : generalChecklist.length === 0 ? (
            <div className="p-12 text-center">
              <Eye className="w-8 h-8 text-[#8B5CF6]/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#1E1235]">No inspections yet</p>
              <p className="text-xs text-[#5B4B7C] mt-1">Go to Assets → click the 👁 button to run your first AI inspection</p>
            </div>
          ) : (
            generalChecklist.map((item, idx) => {
              const sc = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG["None"];
              return (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl border ${sc.bg} ${sc.border}`}>
                      <Brain className={`w-4 h-4 ${sc.color}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1E1235]">{item.assetName}</h4>
                      <p className="text-[10px] text-[#5B4B7C] mt-0.5 font-medium">
                        {item.date} • Next: <span className="text-[#1E1235] font-mono font-bold">{item.nextInspectionDate || "N/A"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.severity && item.severity !== "None" && (
                      <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${sc.bg} ${sc.color} ${sc.border}`}>
                        {item.severity}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                      item.status === "Passed" ? "bg-emerald-500/15 text-emerald-800 border border-emerald-500/30" : "bg-orange-500/15 text-orange-800 border border-orange-500/30"
                    }`}>
                      {item.status === "Passed"
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        : <AlertTriangle className="w-3 h-3 text-orange-600" />
                      }
                      {item.status}
                    </span>
                    <button
                      onClick={() => handleDeleteInspection(item.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual Inspection Modal */}
      {isManualModalOpen && (
        <div className="fixed -top-20 -bottom-20 -left-20 -right-20 bg-[#1E1235]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md glass-modal rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={handleCloseManualModal}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/50 border border-white/80 text-[#5B4B7C] hover:text-[#1E1235] hover:bg-white transition-all z-10"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 px-7 pt-7 pb-2 flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center shadow-md">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1E1235]">Manual Structural Inspection</h3>
                <p className="text-xs text-[#5B4B7C] font-medium">Record inspector field findings & severity overrides.</p>
              </div>
            </div>

            <form onSubmit={handleSaveManualInspection} className="space-y-4 px-7 pb-7 pt-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Drone Images</label>
                <div className="border-2 border-dashed border-white/90 bg-white/40 rounded-xl p-4 flex flex-col items-center justify-center hover:border-[#8B5CF6]/40 transition-all relative group">
                  <input
                    type="file" multiple accept="image/*"
                    onChange={handleManualImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={manualUploading}
                  />
                  {manualUploading
                    ? <Loader2 className="w-5 h-5 text-[#6D28D9] mb-1.5 animate-spin" />
                    : <Upload className="w-5 h-5 text-[#5B4B7C] mb-1.5 group-hover:text-[#6D28D9] transition-all" />
                  }
                  <span className="text-xs text-[#1E1235] font-medium">Click or drag drone images here</span>
                  <span className="text-[10px] text-[#5B4B7C] mt-0.5">JPEG, PNG — max 10MB each</span>
                </div>
                {manualImages.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {manualImages.map((img, i) => (
                      <div key={i} className="w-14 h-14 rounded-lg border border-white/80 overflow-hidden bg-white/50">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Defect / Anomaly Type</label>
                <select
                  value={manualDefectType}
                  onChange={(e) => setManualDefectType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                >
                  <option value="Concrete Spalling & Crack">Concrete Spalling & Crack</option>
                  <option value="Solar Thermal Hotspot">Solar Thermal Hotspot</option>
                  <option value="Structural Corrosion Streak">Structural Corrosion Streak</option>
                  <option value="Road Surface Pothole">Road Surface Pothole</option>
                  <option value="Volumetric Stockpile Drift">Volumetric Stockpile Drift</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Location / Grid Coordinates</label>
                <input
                  type="text"
                  required
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="e.g. East Pillar 4 (Elevation 15m)"
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Severity Grade</label>
                <select
                  value={manualSeverity}
                  onChange={(e) => setManualSeverity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                >
                  <option value="None">None (Satisfactory)</option>
                  <option value="Minor">Minor (Monitor)</option>
                  <option value="Action Required">Action Required (Maintenance Needed)</option>
                  <option value="High">High (Immediate Risk)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Estimated Defect Dimension</label>
                <input
                  type="text"
                  value={manualSize}
                  onChange={(e) => setManualSize(e.target.value)}
                  placeholder="e.g. 15mm width x 1.2m length"
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Inspector Field Notes</label>
                <textarea
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Add details, structural risk observations, or maintenance instructions..."
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseManualModal}
                  className="flex-1 py-2.5 bg-white/60 border border-white/90 text-[#1E1235] rounded-xl text-xs font-bold hover:bg-white transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-extrabold rounded-xl text-xs hover:from-[#5B21B6] hover:to-[#7C3AED] transition-all shadow-lg shadow-[#8B5CF6]/30"
                >
                  Save Manual Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

