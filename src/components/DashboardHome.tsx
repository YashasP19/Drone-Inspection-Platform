import { useEffect, useMemo, useState } from "react";
import { Folder, ClipboardCheck, AlertTriangle, MapPin } from "lucide-react";
import MapOverviewModal from "./MapOverviewModal";
import { API_BASE_URL, PLACEHOLDER_IMAGE, onImageError } from "../config";

interface DashboardHomeProps {
  onViewAllProjects: () => void;
}

interface Asset {
  id: string;
  name: string;
  infrastructureType: string;
  location: string;
  thumbnail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentState {
  status: string;
  confidence: number;
  output?: { defects_found?: { type: string }[] };
}

interface Inspection {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  severity: string;
  status: string;
  agentStates: Record<string, AgentState>;
}

export default function DashboardHome({ onViewAllProjects }: DashboardHomeProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/assets`).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/inspections`).then((r) => r.json())
    ])
      .then(([assetsData, inspectionsData]) => {
        setAssets(assetsData);
        setInspections(inspectionsData);
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  const defectsPerInspection = useMemo(
    () => inspections.map((i) => i.agentStates?.defect_detection?.output?.defects_found || []),
    [inspections]
  );

  const totalIssuesDetected = useMemo(
    () => defectsPerInspection.reduce((sum, d) => sum + d.length, 0),
    [defectsPerInspection]
  );

  const metrics = [
    { label: "Assets", value: String(assets.length), color: "text-[#6D28D9]", icon: Folder, bg: "bg-[#6D28D9]/10 border-[#6D28D9]/20" },
    { label: "Inspections", value: String(inspections.length), color: "text-[#8B5CF6]", icon: ClipboardCheck, bg: "bg-[#8B5CF6]/10 border-[#8B5CF6]/20" },
    { label: "Issues Detected", value: String(totalIssuesDetected), color: "text-amber-600", icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/20" }
  ];

  const MARKER_LAYOUT = [
    { top: "35%", left: "25%" },
    { top: "55%", left: "45%" },
    { top: "30%", left: "65%" },
    { top: "65%", left: "80%" },
    { top: "70%", left: "15%" }
  ];
  const mapMarkerPositions = MARKER_LAYOUT.slice(0, Math.max(1, Math.min(assets.length, MARKER_LAYOUT.length)));

  const recentAssets = useMemo(
    () =>
      [...assets]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [assets]
  );

  const severityBuckets = useMemo(() => {
    const buckets = { none: 0, minor: 0, major: 0, critical: 0 };
    defectsPerInspection.forEach((defects) => {
      if (defects.length === 0) buckets.none++;
      else if (defects.length === 1) buckets.minor++;
      else if (defects.length <= 3) buckets.major++;
      else buckets.critical++;
    });
    return buckets;
  }, [defectsPerInspection]);

  const totalInspections = inspections.length;
  const pct = (n: number) => (totalInspections > 0 ? Math.round((n / totalInspections) * 100) : 0);

  const donutSegments = [
    { key: "none", label: "No Issues", count: severityBuckets.none, color: "#6D28D9" },
    { key: "minor", label: "Minor Issues", count: severityBuckets.minor, color: "#8B5CF6" },
    { key: "major", label: "Major Issues", count: severityBuckets.major, color: "#F59E0B" },
    { key: "critical", label: "Critical Issues", count: severityBuckets.critical, color: "#EF4444" }
  ];

  let cumulative = 0;
  const donutArcs = donutSegments.map((seg) => {
    const percent = totalInspections > 0 ? (seg.count / totalInspections) * 100 : 0;
    const arc = { ...seg, percent, offset: 100 - cumulative };
    cumulative += percent;
    return arc;
  });

  const issueTypes = useMemo(() => {
    const counts = new Map<string, number>();
    defectsPerInspection.flat().forEach((d) => {
      counts.set(d.type, (counts.get(d.type) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    return sorted.map(([name, count]) => ({ name, count, max }));
  }, [defectsPerInspection]);

  const confidenceSeries = useMemo(() => {
    const points = inspections
      .map((i) => {
        const states = Object.values(i.agentStates || {});
        const confidences = states.map((s) => s.confidence).filter((c) => typeof c === "number");
        const avg = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
        return { date: i.date, avg };
      })
      .reverse()
      .slice(-6);
    return points;
  }, [inspections]);

  const linePath = useMemo(() => {
    if (confidenceSeries.length === 0) return { line: "", area: "" };
    const stepX = confidenceSeries.length > 1 ? 100 / (confidenceSeries.length - 1) : 0;
    const coords = confidenceSeries.map((p, idx) => {
      const x = idx * stepX;
      const y = 40 - (p.avg / 100) * 38;
      return `${x},${y.toFixed(1)}`;
    });
    const line = `M${coords.join(" L")}`;
    const area = `${line} L100,40 L0,40 Z`;
    return { line, area };
  }, [confidenceSeries]);

  return (
    <div className="space-y-8 text-left">
      {/* Subtitle Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#1E1235]">Dashboard</h2>
        <p className="text-xs text-[#5B4B7C] mt-1 font-medium">
          {loading ? "Loading live data..." : "Live overview of your infrastructure inspections."}
        </p>
      </div>

      {/* Metrics Row - Light Glassmorphism Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="glass-card-app rounded-3xl p-6 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#5B4B7C] uppercase tracking-wider">{m.label}</span>
                <div className={`p-2 rounded-xl border ${m.bg}`}>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-[#1E1235] font-mono">{m.value}</span>
              </div>
              <span className="text-[10px] text-[#6D28D9] font-bold mt-1 block">live count</span>
            </div>
          );
        })}
      </div>

      {/* Middle Row - Light Glass Cards */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Assets Card */}
        <div
          onClick={onViewAllProjects}
          className="lg:col-span-5 glass-card-app rounded-3xl p-6 flex flex-col cursor-pointer group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold text-[#1E1235] uppercase tracking-wider">Recent Assets</h3>
            <span className="text-xs text-[#6D28D9] font-bold group-hover:underline transition-all">View all →</span>
          </div>
          <div className="space-y-3">
            {recentAssets.length === 0 ? (
              <p className="text-xs text-[#5B4B7C]">No assets yet.</p>
            ) : (
              recentAssets.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white/50 border border-white/80 hover:bg-white/90 transition-all">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img src={a.thumbnail || PLACEHOLDER_IMAGE} onError={onImageError} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/80 shadow-sm" />
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[#1E1235] truncate">{a.name}</h4>
                      <p className="text-[10px] text-[#5B4B7C] mt-0.5">{a.infrastructureType} • {a.location}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${a.status === "Passed" ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30" : "bg-red-500/15 text-red-700 border border-red-500/30"
                    }`}>
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Overview Card */}
        <div
          onClick={() => setIsMapOpen(true)}
          className="lg:col-span-7 glass-card-app rounded-3xl p-6 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-extrabold text-[#1E1235] uppercase tracking-wider">Map Overview</h3>
            <span className="text-xs text-[#6D28D9] font-bold group-hover:underline transition-all">Open Map →</span>
          </div>
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/80 bg-slate-900 shadow-inner">
            <div
              className="absolute inset-0 bg-cover bg-center filter contrast-110"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80")' }}
            />
            <div className="absolute inset-0 bg-[#1E1235]/30 backdrop-blur-[1px]" />
            {mapMarkerPositions.map((pos, idx) => (
              <div key={idx} className="absolute -translate-x-1/2 -translate-y-full z-10" style={{ top: pos.top, left: pos.left }}>
                <span className="absolute inset-0 -m-1.5 rounded-full bg-amber-400/50 animate-ping" />
                <MapPin className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-md" />
              </div>
            ))}
            <div className="absolute bottom-3 right-3 bg-white/90 text-[10px] text-[#1E1235] font-bold px-3 py-1.5 rounded-xl border border-white backdrop-blur-md shadow-sm">
              Click to open interactive map
            </div>
          </div>
        </div>
      </div>

      {isMapOpen && <MapOverviewModal onClose={() => setIsMapOpen(false)} />}

      {/* Bottom Row: Glassmorphism Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Donut Chart (Inspection Summary) */}
        <div className="glass-card-app rounded-3xl p-6">
          <h3 className="text-sm font-extrabold text-[#1E1235] uppercase tracking-wider mb-6">Inspection Summary</h3>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* SVG Donut */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E6DEFE" strokeWidth="3" />
                {donutArcs.map((arc) => (
                  <circle
                    key={arc.key}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="3"
                    strokeDasharray={`${arc.percent} ${100 - arc.percent}`}
                    strokeDashoffset={arc.offset}
                  />
                ))}
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-extrabold text-[#1E1235]">{totalInspections}</span>
                <span className="text-[9px] text-[#5B4B7C] font-bold block uppercase">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="text-xs space-y-2 flex-grow">
              {donutSegments.map((seg) => (
                <div key={seg.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: seg.color }} />
                    <span className="text-[#5B4B7C] font-medium">{seg.label}</span>
                  </div>
                  <span className="font-bold text-[#1E1235] font-mono">{seg.count} ({pct(seg.count)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart (Issues by Type) */}
        <div className="glass-card-app rounded-3xl p-6">
          <h3 className="text-sm font-extrabold text-[#1E1235] uppercase tracking-wider mb-6">Issues by Type</h3>
          <div className="space-y-4">
            {issueTypes.length === 0 ? (
              <p className="text-xs text-[#5B4B7C]">No defects recorded yet.</p>
            ) : (
              issueTypes.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5B4B7C] font-semibold truncate pr-2">{item.name}</span>
                    <span className="text-[#1E1235] font-bold font-mono">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-white/60 border border-white/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] rounded-full"
                      style={{ width: `${(item.count / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Line Chart (AI Confidence) */}
        <div className="glass-card-app rounded-3xl p-6">
          <h3 className="text-sm font-extrabold text-[#1E1235] uppercase tracking-wider mb-6">AI Model Confidence (Avg.)</h3>
          <div className="relative h-28 w-full mt-4">
            {confidenceSeries.length === 0 ? (
              <p className="text-xs text-[#5B4B7C]">No inspections yet.</p>
            ) : (
              <>
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={linePath.area} fill="url(#chartGradient)" />
                  <path d={linePath.line} fill="none" stroke="#6D28D9" strokeWidth="2" />
                </svg>
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <span className="text-[8px] text-[#5B4B7C] font-mono">100%</span>
                  <span className="text-[8px] text-[#5B4B7C] font-mono">50%</span>
                  <span className="text-[8px] text-[#5B4B7C] font-mono">0%</span>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-between text-[8px] text-[#5B4B7C] mt-2 font-mono font-semibold">
            {confidenceSeries.map((p, idx) => (
              <span key={idx}>{p.date}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
