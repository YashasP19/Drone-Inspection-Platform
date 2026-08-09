import { useEffect, useState } from "react";
import {
  ScanEye, Eye, Shield, Wrench, FileCheck,
  Loader2, MessagesSquare, Sparkles, ChevronDown, ChevronUp, Trash2
} from "lucide-react";

interface Inspection {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  severity: string;
  status: string;
  agentStates: Record<string, { status: string; reasoning: string; confidence: number; output: any }>;
  reportMarkdown: string;
  nextInspectionDate?: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  None:             { color: "text-emerald-700", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  Minor:            { color: "text-amber-700",  bg: "bg-amber-500/15",  border: "border-amber-500/30" },
  "Action Required":{ color: "text-orange-700", bg: "bg-orange-500/15", border: "border-orange-500/30" },
  High:             { color: "text-red-700",    bg: "bg-red-500/15",    border: "border-red-500/30" },
};

const PERSONAS = [
  {
    key: "image_analysis",
    name: "Vision Agent",
    role: "Image Quality & Sensor Analysis",
    icon: ScanEye,
    color: "text-blue-700",
    bg: "bg-blue-500/15",
    border: "border-blue-500/25",
    speak: (o: any) =>
      o?.suitability
        ? `Suitability looks ${String(o.suitability).toLowerCase()} — sensor reads as ${o.sensor_type || "unknown"}. ${o.image_quality_metrics || ""}`
        : "No visual findings to report.",
  },
  {
    key: "defect_detection",
    name: "Detection Agent",
    role: "Defect & Anomaly Scanning",
    icon: Eye,
    color: "text-purple-700",
    bg: "bg-purple-500/15",
    border: "border-purple-500/25",
    speak: (o: any) =>
      o?.total_count > 0
        ? `I found ${o.total_count} defect${o.total_count === 1 ? "" : "s"}: ${(o.defects_found || [])
            .map((d: any) => d.type)
            .join(", ")}.`
        : "I didn't find any visible defects in the imagery provided.",
  },
  {
    key: "severity_assessment",
    name: "Risk Agent",
    role: "Severity & Priority Grading",
    icon: Shield,
    color: "text-orange-700",
    bg: "bg-orange-500/15",
    border: "border-orange-500/25",
    speak: (o: any) =>
      o?.overall_severity
        ? `Based on those findings, I'm grading this as ${o.overall_severity} (risk score ${o.risk_score ?? "—"}/100, priority ${o.priority || "—"}).`
        : "Not enough data to assign a risk grade.",
  },
  {
    key: "recommendation",
    name: "Advisory Agent",
    role: "Corrective Actions & Scheduling",
    icon: Wrench,
    color: "text-amber-700",
    bg: "bg-amber-500/15",
    border: "border-amber-500/25",
    speak: (o: any) =>
      o?.recommended_actions?.length
        ? `Here's what I'd recommend: ${o.recommended_actions.join("; ")}. Next inspection due ${o.next_inspection_date || "—"}.`
        : "No specific corrective actions needed at this time.",
  },
  {
    key: "report",
    name: "Reporting Agent",
    role: "Final Report Compilation",
    icon: FileCheck,
    color: "text-emerald-700",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/25",
    speak: (o: any) => o?.executive_summary || "Report compiled from the panel's findings above.",
  },
];

export default function AIDiscussionView() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedRaw, setExpandedRaw] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:5001/api/inspections")
      .then((res) => res.json())
      .then((data: Inspection[]) => {
        setInspections(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((err) => console.error("Error fetching inspections:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this AI panel discussion?")) return;
    try {
      await fetch(`http://localhost:5001/api/inspections/${id}`, { method: "DELETE" });
      const updated = inspections.filter((i) => i.id !== id);
      setInspections(updated);
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      console.error("Error deleting discussion:", err);
    }
  };

  const handleClearAllConversations = async () => {
    if (!confirm("Are you sure you want to clear ALL AI panel discussions? This action cannot be undone.")) return;
    try {
      await fetch("http://localhost:5001/api/inspections", { method: "DELETE" });
      setInspections([]);
      setSelectedId(null);
    } catch (err) {
      console.error("Error clearing discussions:", err);
    }
  };

  const active = inspections.find((i) => i.id === selectedId);

  return (
    <div className="space-y-6 text-left relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/25 text-[#6D28D9] text-xs font-bold mb-2 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Multi-Agent Consensus Panel</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1E1235]">AI Panel Discussion</h2>
          <p className="text-xs text-[#5B4B7C] mt-1 font-medium max-w-2xl">
            Watch the 5 LangGraph AI agents debate and reason about this asset — from image quality validation to risk grading and report export.
          </p>
        </div>

        {inspections.length > 0 && (
          <button
            onClick={handleClearAllConversations}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-500/15 hover:bg-red-600 border border-red-500/30 text-red-600 hover:text-white text-xs font-extrabold rounded-2xl transition-all shadow-sm backdrop-blur-md"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Panel Discussions</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-card-app rounded-3xl p-12 text-center text-[#5B4B7C] flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#6D28D9]" />
          <span className="text-xs font-semibold">Loading agent transcripts...</span>
        </div>
      ) : inspections.length === 0 ? (
        <div className="glass-card-app rounded-3xl p-12 text-center text-[#5B4B7C]">
          <MessagesSquare className="w-8 h-8 text-[#6D28D9] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No inspection discussions available yet. Run an inspection from the Assets page first.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Inspection Selector (Left Sidebar) */}
          <div className="lg:col-span-4 glass-card-app rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">
                Select Conversation ({inspections.length})
              </h3>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {inspections.map((item) => {
                const isSelected = item.id === selectedId;
                const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.None;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[#C4BDF3]/60 text-[#4C1D95] border-[#C4BDF3] shadow-sm font-bold"
                        : "bg-white/40 border-white/70 text-[#1E1235] hover:bg-white/80"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold truncate pr-2">{item.assetName}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isSelected ? "bg-white/30 text-[#4C1D95]" : `${cfg.bg} ${cfg.color}`}`}>
                          {item.severity}
                        </span>
                      </div>
                      <div className={`text-[10px] flex justify-between items-center ${isSelected ? "text-[#4C1D95]/80" : "text-[#5B4B7C]"}`}>
                        <span>{item.date}</span>
                        <span className="font-mono">{item.id}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteConversation(item.id, e)}
                      className="p-1.5 opacity-60 group-hover:opacity-100 hover:bg-red-500/20 text-red-600 rounded-lg transition-all"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discussion Thread (Right Panel) */}
          <div className="lg:col-span-8 glass-card-app rounded-3xl p-6 space-y-6">
            {active && (
              <>
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/60 gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#1E1235]">{active.assetName}</h3>
                    <p className="text-xs text-[#5B4B7C] font-medium mt-0.5">
                      Inspection Run <span className="font-mono text-[#6D28D9] font-bold">{active.id}</span> • {active.date}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${SEVERITY_CONFIG[active.severity]?.bg} ${SEVERITY_CONFIG[active.severity]?.color} ${SEVERITY_CONFIG[active.severity]?.border}`}>
                      Severity: {active.severity}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(active.id, e)}
                      className="p-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 5-Agent Discussion Timeline */}
                <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#8B5CF6]/20">
                  {PERSONAS.map((p) => {
                    const agentData = active.agentStates?.[p.key] || {
                      status: "pending",
                      reasoning: "Awaiting execution...",
                      confidence: 0,
                      output: {},
                    };
                    const Icon = p.icon;
                    const speech = p.speak(agentData.output);
                    const isRawOpen = expandedRaw === p.key;

                    return (
                      <div key={p.key} className="relative flex items-start space-x-4 pl-1">
                        {/* Avatar */}
                        <div className={`relative z-10 w-9 h-9 rounded-2xl ${p.bg} ${p.border} border flex items-center justify-center ${p.color} shadow-sm flex-shrink-0`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>

                        {/* Speech Bubble */}
                        <div className="flex-grow bg-white/60 border border-white/80 rounded-2xl p-4 shadow-sm space-y-2 backdrop-blur-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-extrabold text-[#1E1235]">{p.name}</span>
                              <span className="text-[10px] text-[#5B4B7C] font-medium">• {p.role}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#6D28D9]">
                              {(agentData.confidence * 100).toFixed(0)}% Confidence
                            </span>
                          </div>

                          {/* Primary Speech Text */}
                          <p className="text-xs text-[#1E1235] leading-relaxed font-medium bg-white/40 p-3 rounded-xl border border-white/60">
                            "{speech}"
                          </p>

                          {/* Reasoning & Output toggle */}
                          {agentData.reasoning && (
                            <p className="text-[11px] text-[#5B4B7C] leading-snug">
                              <strong className="text-[#1E1235]">Agent Thought:</strong> {agentData.reasoning}
                            </p>
                          )}

                          {/* Raw Output Accordion */}
                          <div>
                            <button
                              onClick={() => setExpandedRaw(isRawOpen ? null : p.key)}
                              className="text-[10px] font-bold text-[#6D28D9] hover:underline flex items-center space-x-1"
                            >
                              <span>{isRawOpen ? "Hide Raw Data" : "View Agent Output JSON"}</span>
                              {isRawOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isRawOpen && (
                              <pre className="mt-2 text-[10px] font-mono bg-[#100A1F] text-[#C4BDF3] p-3 rounded-xl overflow-x-auto max-h-40 border border-white/20">
                                {JSON.stringify(agentData.output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

