import { useEffect, useState } from "react";
import { Play, Database, ShieldAlert, Cpu, Terminal, Eye, CheckCircle2, Loader2, ArrowRight, Activity, Award } from "lucide-react";
import { API_BASE_URL } from "../config";

interface Asset {
  id: string;
  name: string;
  infrastructureType: string;
  location: string;
  gDriveLink?: string;
}

interface AgentState {
  status: "Waiting" | "Running" | "Completed" | "Failed";
  progress: number;
  reasoning: string;
  decision: string;
  confidence: number;
}

interface OrchestrationData {
  status: "Idle" | "Active" | "Completed" | "Failed";
  progress: number;
  agents: {
    retrieval: AgentState;
    quality: AgentState;
    coverage: AgentState;
    planner: AgentState;
    manager: AgentState;
  };
  logs: string[];
  timestamp?: string;
}

interface FlightsViewProps {
  onNavigateToInspection: (asset: any) => void;
}

export default function FlightsView({ onNavigateToInspection }: FlightsViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [pipelineData, setPipelineData] = useState<OrchestrationData | null>(null);
  const [isPipelineActive, setIsPipelineActive] = useState(false);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeExpandedAgent, setActiveExpandedAgent] = useState<string | null>(null);

  // 1. Fetch assets on load
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/assets`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
          if (data.length > 0) {
            setSelectedAsset(data[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching assets:", err);
      }
    };
    fetchAssets();
  }, []);

  // 2. Poll Orchestrator Status when active
  useEffect(() => {
    if (!isPipelineActive) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ai-orchestration/status`);
        if (!res.ok) throw new Error("Connection failed");
        const data = (await res.json()) as OrchestrationData;
        setPipelineData(data);
        if (data.logs) {
          setLogs(data.logs);
        }

        if (data.status === "Completed" && data.progress >= 100) {
          setIsPipelineComplete(true);
        }
      } catch (err) {
        console.error("Error polling orchestrator status:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 1500); // Poll slightly faster for snappier UI feel
    return () => clearInterval(interval);
  }, [isPipelineActive]);

  const handleStartPipeline = async () => {
    if (!selectedAsset) return;
    setIsPipelineComplete(false);
    setLogs(["Orchestrator: Connecting and initializing agents..."]);
    try {
      await fetch(`${API_BASE_URL}/ai-orchestration/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: selectedAsset })
      });
      setIsPipelineActive(true);
    } catch (err) {
      console.error("Error starting AI pipeline:", err);
    }
  };

  const handleReset = () => {
    setIsPipelineActive(false);
    setIsPipelineComplete(false);
    setPipelineData(null);
    setLogs([]);
    setActiveExpandedAgent(null);
  };

  const getAgentStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Running":
        return "bg-white/10 text-white border border-white/20 animate-pulse";
      case "Failed":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      default:
        return "bg-neutral-900 text-gray-500 border border-white/5";
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-white">AI Mission Center</h2>
        <p className="text-xs text-gray-500 mt-1">Multi-Agent AI Orchestration Dashboard. Run validations, map plans, and compile assets.</p>
      </div>

      {!isPipelineActive ? (
        /* State A: Pipeline Selector Configurator */
        <div className="max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Cpu className="w-4.5 h-4.5 text-white" />
            <span>Configure Orchestration Job</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400">Select Input Asset</label>
              <select
                value={selectedAsset?.id || ""}
                onChange={(e) => setSelectedAsset(assets.find((a) => a.id === e.target.value) || null)}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-white transition-colors"
              >
                {assets.length === 0 ? (
                  <option value="">No assets registered. Create one in Assets view first.</option>
                ) : (
                  assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.location})
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedAsset?.gDriveLink && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-gray-400 space-y-1">
                <span className="font-bold text-white uppercase block">Target Source Folder</span>
                <span className="font-mono break-all">{selectedAsset.gDriveLink}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleStartPipeline}
            disabled={!selectedAsset}
            className="w-full py-3 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-gray-500 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center space-x-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Trigger Multi-Agent pipeline</span>
          </button>
        </div>
      ) : (
        /* State B: Live Agent Flow Tracking */
        <div className="space-y-6">
          {/* Orchestrator Master HUD */}
          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-white text-black rounded-xl">
                <Cpu className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Orchestrator Mode</span>
                <h3 className="text-sm font-bold text-white mt-0.5">Coordinating 4 Agents for {selectedAsset?.name}</h3>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1 text-right">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                <span>Pipeline progress</span>
                <span>{pipelineData?.progress || 0}%</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-white h-full transition-all duration-1000 ease-out"
                  style={{ width: `${pipelineData?.progress || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Error reset banner */}
          {pipelineData?.status === "Failed" && (
            <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-red-400">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-xs font-bold">Pipeline Validation Aborted</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">The pipeline identified invalid content formats (e.g. video stream) that cannot be parsed.</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all"
              >
                Reset Job
              </button>
            </div>
          )}

          {/* Central Workflow Grid */}
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* Visual Agent pipeline layout */}
            <div className="lg:col-span-8 bg-neutral-950 border border-white/10 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Agent Pipeline Timeline</span>

              <div className="space-y-3">
                
                {/* Agent 1: Retrieval */}
                <div 
                  onClick={() => setActiveExpandedAgent(activeExpandedAgent === "retrieval" ? null : "retrieval")}
                  className={`p-4 bg-white/[0.02] border rounded-xl hover:border-white/20 transition-all cursor-pointer ${
                    activeExpandedAgent === "retrieval" ? "border-white/30 bg-white/[0.04]" : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-neutral-900 border border-white/10 rounded-lg text-white">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Retrieval Agent</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Fetches orthomosaic images from Google Drive</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase ${getAgentStatusBadgeClass(pipelineData?.agents?.retrieval?.status || "Waiting")}`}>
                      {pipelineData?.agents?.retrieval?.status || "Waiting"}
                    </span>
                  </div>
                  {activeExpandedAgent === "retrieval" && pipelineData?.agents?.retrieval?.reasoning && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-[10px]">
                      <div className="text-gray-400 font-bold uppercase tracking-wider">Agent Reasoning Output:</div>
                      <p className="text-gray-300 leading-relaxed font-mono">{pipelineData.agents?.retrieval?.reasoning}</p>
                      <div className="flex justify-between items-center text-gray-500 pt-1 font-mono text-[9px]">
                        <span>Decision: {pipelineData.agents?.retrieval?.decision}</span>
                        <span>Confidence: {pipelineData.agents?.retrieval?.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Handoff Line */}
                <div className="flex justify-center -my-2">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 transform rotate-90" />
                </div>

                {/* Agent 2: Quality */}
                <div 
                  onClick={() => setActiveExpandedAgent(activeExpandedAgent === "quality" ? null : "quality")}
                  className={`p-4 bg-white/[0.02] border rounded-xl hover:border-white/20 transition-all cursor-pointer ${
                    activeExpandedAgent === "quality" ? "border-white/30 bg-white/[0.04]" : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-neutral-900 border border-white/10 rounded-lg text-white">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Mission Quality Agent</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">AI-reasoned analysis on sensor specs, pixel resolutions, and camera quality suitability</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase ${getAgentStatusBadgeClass(pipelineData?.agents?.quality?.status || "Waiting")}`}>
                      {pipelineData?.agents?.quality?.status || "Waiting"}
                    </span>
                  </div>
                  {activeExpandedAgent === "quality" && pipelineData?.agents?.quality?.reasoning && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-[10px]">
                      <div className="text-gray-400 font-bold uppercase tracking-wider">Agent Reasoning Output:</div>
                      <p className="text-gray-300 leading-relaxed font-mono">{pipelineData.agents?.quality?.reasoning}</p>
                      <div className="flex justify-between items-center text-gray-500 pt-1 font-mono text-[9px]">
                        <span>Decision: {pipelineData.agents?.quality?.decision}</span>
                        <span>Confidence: {pipelineData.agents?.quality?.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Handoff Line */}
                <div className="flex justify-center -my-2">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 transform rotate-90" />
                </div>

                {/* Agent 3: Coverage */}
                <div 
                  onClick={() => setActiveExpandedAgent(activeExpandedAgent === "coverage" ? null : "coverage")}
                  className={`p-4 bg-white/[0.02] border rounded-xl hover:border-white/20 transition-all cursor-pointer ${
                    activeExpandedAgent === "coverage" ? "border-white/30 bg-white/[0.04]" : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-neutral-900 border border-white/10 rounded-lg text-white">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Coverage Analysis Agent</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">AI-reasoned spatial calculation verifying grid density, GDrive overlap, and map drift bounds</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase ${getAgentStatusBadgeClass(pipelineData?.agents?.coverage?.status || "Waiting")}`}>
                      {pipelineData?.agents?.coverage?.status || "Waiting"}
                    </span>
                  </div>
                  {activeExpandedAgent === "coverage" && pipelineData?.agents?.coverage?.reasoning && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-[10px]">
                      <div className="text-gray-400 font-bold uppercase tracking-wider">Agent Reasoning Output:</div>
                      <p className="text-gray-300 leading-relaxed font-mono">{pipelineData.agents?.coverage?.reasoning}</p>
                      <div className="flex justify-between items-center text-gray-500 pt-1 font-mono text-[9px]">
                        <span>Decision: {pipelineData.agents?.coverage?.decision}</span>
                        <span>Confidence: {pipelineData.agents?.coverage?.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Handoff Line */}
                <div className="flex justify-center -my-2">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 transform rotate-90" />
                </div>

                {/* Agent 4: Planner */}
                <div 
                  onClick={() => setActiveExpandedAgent(activeExpandedAgent === "planner" ? null : "planner")}
                  className={`p-4 bg-white/[0.02] border rounded-xl hover:border-white/20 transition-all cursor-pointer ${
                    activeExpandedAgent === "planner" ? "border-white/30 bg-white/[0.04]" : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-neutral-900 border border-white/10 rounded-lg text-white">
                        <Play className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Mission Planning Agent</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">AI-reasoned partitioning sorting image sets into logical GPU classification batches</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase ${getAgentStatusBadgeClass(pipelineData?.agents?.planner?.status || "Waiting")}`}>
                      {pipelineData?.agents?.planner?.status || "Waiting"}
                    </span>
                  </div>
                  {activeExpandedAgent === "planner" && pipelineData?.agents?.planner?.reasoning && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-[10px]">
                      <div className="text-gray-400 font-bold uppercase tracking-wider">Agent Reasoning Output:</div>
                      <p className="text-gray-300 leading-relaxed font-mono">{pipelineData.agents?.planner?.reasoning}</p>
                      <div className="flex justify-between items-center text-gray-500 pt-1 font-mono text-[9px]">
                        <span>Decision: {pipelineData.agents?.planner?.decision}</span>
                        <span>Confidence: {pipelineData.agents?.planner?.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Handoff Line */}
                <div className="flex justify-center -my-2">
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 transform rotate-90" />
                </div>

                {/* Agent 5: Manager */}
                <div 
                  onClick={() => setActiveExpandedAgent(activeExpandedAgent === "manager" ? null : "manager")}
                  className={`p-4 bg-white/[0.02] border rounded-xl hover:border-white/20 transition-all cursor-pointer ${
                    activeExpandedAgent === "manager" ? "border-white/30 bg-white/[0.04]" : "border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-neutral-900 border border-white/10 rounded-lg text-white">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Workflow Manager Agent</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">AI-reasoned consensus reviewer marking projects overall ready or requiring flight resets</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase ${getAgentStatusBadgeClass(pipelineData?.agents?.manager?.status || "Waiting")}`}>
                      {pipelineData?.agents?.manager?.status || "Waiting"}
                    </span>
                  </div>
                  {activeExpandedAgent === "manager" && pipelineData?.agents?.manager?.reasoning && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-[10px]">
                      <div className="text-gray-400 font-bold uppercase tracking-wider">Agent Reasoning Output:</div>
                      <p className="text-gray-300 leading-relaxed font-mono">{pipelineData.agents?.manager?.reasoning}</p>
                      <div className="flex justify-between items-center text-gray-500 pt-1 font-mono text-[9px]">
                        <span>Decision: {pipelineData.agents?.manager?.decision}</span>
                        <span>Confidence: {pipelineData.agents?.manager?.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Console Log Terminal Output */}
            <div className="lg:col-span-4 bg-neutral-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center space-x-2 text-gray-400 pb-3 border-b border-white/10 mb-4">
                  <Terminal className="w-4 h-4 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Orchestration Logs</span>
                </div>

                <div className="font-mono text-[9px] text-gray-400 space-y-2.5 overflow-y-auto max-h-[340px] pr-2 custom-scrollbar text-left">
                  {logs.map((log, i) => (
                    <div key={i} className="leading-relaxed border-l-2 border-white/20 pl-2">
                      {log}
                    </div>
                  ))}
                  {isPipelineActive && !isPipelineComplete && (
                    <div className="flex items-center space-x-1 text-gray-500 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Awaiting agent reasoning feedback...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 mt-3 flex justify-between items-center text-[9px] text-gray-500 font-mono">
                <span>Status: {pipelineData?.status}</span>
                <button 
                  onClick={handleReset}
                  className="px-2.5 py-1 hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded transition-all"
                >
                  Reset Job
                </button>
              </div>
            </div>

          </div>

          {/* Mission Complete handover card overlay */}
          {isPipelineComplete && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="w-full max-w-sm bg-neutral-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-center space-y-6">
                <div className="mx-auto w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">AI Consensus Resolved</h3>
                  <p className="text-xs text-gray-500">
                    Orchestration successfully concluded. Decision: <span className="font-bold text-emerald-400">{pipelineData?.agents.manager.decision}</span>
                  </p>
                </div>

                <button
                  onClick={() => selectedAsset && onNavigateToInspection(selectedAsset)}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Defect Workspace</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
