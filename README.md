# 🚁 Drone Infrastructure Inspector

> **AI-powered drone inspection platform for infrastructure analysis, defect detection, and automated reporting.**

---

## 🌟 Overview

Drone Infrastructure Inspector is a full-stack platform that automates the entire infrastructure inspection lifecycle — from drone image capture to AI-powered defect analysis and professional report generation.

Powered by a **LangGraph multi-agent pipeline** and a **React + Node.js frontend/backend**, the platform enables engineers to inspect bridges, wind turbines, solar farms, roads, and other critical infrastructure at scale — without manual analysis.

---

## ✨ Features

- 🛸 **Asset Management** — Track all infrastructure assets, their status, and Google Drive image folders
- 📥 **Google Drive Import** — Pull drone photos straight from a shared Drive folder into an inspection instead of manually re-uploading each one; short (`maps.app.goo.gl`) and full map links on the asset are both resolved to real coordinates automatically for the map view
- 👁️ **One-Click AI Inspection** — Upload (or import) at least one drone image, then trigger the full AI inspection pipeline
- 🤖 **Multi-Agent LangGraph Pipeline** — 5 specialized AI agents run sequentially:
  1. **Image Analysis Agent** — Validates image quality, sensor type, and GSD
  2. **Defect Detection Agent** — Identifies cracks, spalling, rust, thermal anomalies
  3. **Severity Assessment Agent** — Grades risk from None → Minor → Action Required → High
  4. **Recommendation Agent** — Suggests corrective actions and next inspection date
  5. **Report Agent** — Compiles a full Markdown inspection report
- 🎯 **Real YOLO Crack Detection** — A pretrained YOLOv8 model (independent of the LLM pipeline above) runs asynchronously after each inspection and overlays real, pixel-accurate bounding boxes on the uploaded image in the Spatial Preview
- 📊 **Live Agent Status UI** — Real-time status (Waiting / Running / Completed / Failed), reasoning, and confidence scores per agent
- 📄 **Automated Report Generation** — Reports are auto-saved and available on the Reports page
- 📅 **Google Calendar Integration** — Create reminders for next inspection dates directly from the UI
- 🗺️ **Map Overview** — Plots all located assets on a Leaflet map using coordinates resolved from their Google Maps link
- 🔒 **Authentication** — Login/signup flow with JWT-based auth
- 🗂️ **Flights & Teams** — Manage drone flights and team members

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                 │
│   AssetsView → InspectionsView → ReportsView            │
└───────────────────┬─────────────────────────────────────┘
                    │ REST / SSE (Server-Sent Events)
┌───────────────────▼─────────────────────────────────────┐
│              Node.js Backend (Express)                   │
│   Auth · Assets · Flights · Reports · DB (lowdb)        │
└───────────────────┬─────────────────────────────────────┘
                    │ REST (POST /inspect)
┌───────────────────▼─────────────────────────────────────┐
│          LangGraph AI Service (FastAPI + Python)         │
│                                                          │
│   Supervisor Agent                                       │
│       ↓                                                  │
│   Image Analysis → Defect Detection → Severity          │
│       → Recommendation → Report                         │
│                                                          │
│   Model: Groq (llama-3.3-70b-versatile), heuristic       │
│   fallback if the API call fails                        │
│                                                          │
│   + POST /detect/crack — pretrained YOLOv8 crack model,  │
│     called independently/async after the pipeline saves  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express 5, lowdb-style flat JSON (`db.json`) |
| AI Service | Python, FastAPI, LangGraph, LangChain, Groq |
| Computer Vision | Ultralytics YOLOv8 (pretrained crack-detection model) |
| Streaming | Server-Sent Events (SSE) |
| Auth | JWT |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Groq](https://console.groq.com/) API key (used by the LangGraph AI service)

### 1. Clone the repo

```bash
git clone https://github.com/yashasp322-ship-it/Drone-Inspection-Platform.git
cd Drone-Inspection-Platform
```

### 2. Set up environment

Create a `.env` file in the root (also copy/create `langgraph_service/.env`, which is loaded in addition to the root one):

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here        # optional, used only by the legacy orchestrator in server.js
GOOGLE_DRIVE_API_KEY=your_google_drive_api_key # required for "Import from Drive" — enable the Drive API
                                                # for your Cloud project and don't restrict the key away from it
```

> The Drive folder linked on an asset must be shared as **"Anyone with the link can view"** — an API key alone can't read private folders.

### 3. Install frontend + backend

```bash
npm install
```

### 4. Set up the LangGraph AI service

```bash
cd langgraph_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python download_models.py   # one-time: fetches the pretrained YOLOv8 crack-detection model
```

### 5. Start all services

**Terminal 1 — Frontend + Node backend:**
```bash
npm run dev          # Vite frontend on :5173
node server.js       # Node backend on :5001
```

**Terminal 2 — AI service:**
```bash
cd langgraph_service
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
Drone Infrastructure Inspector/
├── src/                        # React frontend
│   ├── components/
│   │   ├── AssetsView.tsx       # Asset management + trigger inspection
│   │   ├── InspectionsView.tsx  # Live agent pipeline UI
│   │   ├── ReportsView.tsx      # Generated reports browser
│   │   ├── DashboardShell.tsx   # Main app shell
│   │   └── ...
│   └── App.tsx
├── server.js                   # Node.js Express backend
├── langgraph_service/
│   ├── agent_graph.py          # LangGraph multi-agent pipeline
│   ├── main.py                 # FastAPI endpoints (/inspect, /inspect/stream, /detect/crack)
│   ├── yolo_detector.py        # Pretrained YOLOv8 crack detection (independent of the LLM pipeline)
│   ├── download_models.py      # One-time fetch of the pretrained YOLO weights
│   ├── requirements.txt
│   └── tests.py
└── package.json
```

---

## 🤖 AI Pipeline Details

The LangGraph pipeline uses a **StateGraph** with a deterministic supervisor that routes between 5 specialized agent nodes. Each node:
- Attempts a live Groq API call (`llama-3.3-70b-versatile`)
- Falls back to **heuristic/template-based results** on any failure (missing key, timeout, rate limits, bad JSON, etc.)
- Returns structured JSON that is passed to the next agent

This ensures the inspection always completes and returns a full report, even without a live AI response.

### Real YOLO Crack Detection

`langgraph_service/yolo_detector.py` runs a pretrained YOLOv8 model ([`OpenSistemas/YOLOv8-crack-seg`](https://huggingface.co/OpenSistemas/YOLOv8-crack-seg), 100-epoch trained, box mAP50 ≈ 0.79) via a dedicated `POST /detect/crack` endpoint. It is intentionally scoped to crack detection only — it's the one defect class with a properly-trained public model available; corrosion, spalling, etc. still come from the LLM-based `defect_detection_node` above. The frontend calls this endpoint asynchronously **after** the inspection pipeline finishes and saves, so it never blocks `/inspect/stream` — the Spatial Preview swaps in the real bounding boxes once they arrive.

---

## 📸 Screenshots

> Dashboard, Asset Manager, Live Inspection Pipeline, and Report Viewer all included in the app.

---

## 📝 License

MIT License — feel free to use, modify, and distribute.

---

