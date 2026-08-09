import { useEffect, useState } from "react";
import { Database, Eye, Trash2, Edit2, Plus, X, FolderOpen, Boxes, AlertTriangle, CheckCircle2, CalendarPlus } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  infrastructureType: string;
  location: string;
  thumbnail: string;
  inspectionPageId: string;
  gDriveLink?: string;
  mapLink?: string;
  lat?: number | null;
  lng?: number | null;
  status: string;
  assignedTo?: string | null;
  nextAppointmentDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

function buildGoogleCalendarLink(asset: Asset): string {
  const dateStr = asset.nextAppointmentDate;
  let start: Date;
  if (dateStr) {
    start = new Date(dateStr);
  } else {
    start = new Date();
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Follow-up Inspection: ${asset.name}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Scheduled follow-up inspection appointment for asset "${asset.name}" (${asset.infrastructureType}) at ${asset.location}.`,
    location: asset.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

function parseLatLngFromMapLink(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  return null;
}

interface AssetsViewProps {
  onInspectAsset: (asset: Asset) => void;
}

export default function AssetsView({ onInspectAsset }: AssetsViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentAsset, setCurrentAsset] = useState<Partial<Asset> | null>(null);
  const [name, setName] = useState("");
  const [infrastructureType, setInfrastructureType] = useState("Bridge");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Passed");
  const [gDriveLink, setGDriveLink] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [nextAppointmentDate, setNextAppointmentDate] = useState("");

  const fetchTeam = async () => {
    try {
      const res = await fetch("http://localhost:5001/team");
      const data = await res.json();
      setTeam(data);
    } catch (err) {
      console.error("Error fetching team:", err);
    }
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/assets");
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchTeam();
  }, []);

  const handleOpenAddModal = () => {
    setCurrentAsset(null);
    setName("");
    setInfrastructureType("Bridge");
    setLocation("");
    setStatus("Passed");
    setGDriveLink("");
    setMapLink("");
    setAssignedTo("");
    setNextAppointmentDate("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setCurrentAsset(asset);
    setName(asset.name);
    setInfrastructureType(asset.infrastructureType);
    setLocation(asset.location);
    setStatus(asset.status);
    setGDriveLink(asset.gDriveLink || "");
    setMapLink(asset.mapLink || "");
    setAssignedTo(asset.assignedTo || "");
    setNextAppointmentDate(asset.nextAppointmentDate ? asset.nextAppointmentDate.slice(0, 16) : "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await fetch(`http://localhost:5001/assets/${id}`, { method: "DELETE" });
      fetchAssets();
    } catch (err) {
      console.error("Error deleting asset:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latLng = parseLatLngFromMapLink(mapLink);
    const payload = {
      name,
      infrastructureType,
      location,
      status,
      gDriveLink,
      mapLink,
      lat: latLng ? latLng.lat : currentAsset?.lat || null,
      lng: latLng ? latLng.lng : currentAsset?.lng || null,
      assignedTo: assignedTo || null,
      nextAppointmentDate: nextAppointmentDate ? new Date(nextAppointmentDate).toISOString() : null,
      thumbnail: currentAsset?.thumbnail || "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=400&q=80",
    };

    try {
      if (currentAsset?.id) {
        await fetch(`http://localhost:5001/assets/${currentAsset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("http://localhost:5001/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      console.error("Error saving asset:", err);
    }
  };

  const totalAssets = assets.length;
  const actionRequiredCount = assets.filter((a) => a.status === "Action Required").length;
  const passedCount = assets.filter((a) => a.status === "Passed").length;

  return (
    <div className="space-y-6 text-left relative">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1E1235]">Assets</h2>
          <p className="text-xs text-[#5B4B7C] mt-1 font-medium">Manage 3D scans, elevation models, photogrammetry layers, and source files.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] text-white text-xs font-bold rounded-2xl transition-all shadow-[0_4px_15px_rgba(109,40,217,0.3)] hover:shadow-[0_6px_20px_rgba(109,40,217,0.45)]"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Asset</span>
        </button>
      </div>

      {/* Metrics Row - Light Glass Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div className="glass-card-app rounded-3xl p-6 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#5B4B7C] uppercase tracking-wider block">Total Assets</span>
            <span className="text-2xl font-extrabold text-[#1E1235] mt-2 block font-mono">{totalAssets}</span>
            <span className="text-[10px] text-[#6D28D9] font-semibold mt-1 block">Registered infrastructure assets</span>
          </div>
          <div className="p-2.5 bg-[#8B5CF6]/15 rounded-xl border border-[#8B5CF6]/25 text-[#6D28D9]">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div className="glass-card-app rounded-3xl p-6 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#5B4B7C] uppercase tracking-wider block">Action Required</span>
            <span className="text-2xl font-extrabold text-[#1E1235] mt-2 block font-mono">{actionRequiredCount}</span>
            <span className="text-[10px] text-red-600 font-semibold mt-1 block">Assets needing follow-up</span>
          </div>
          <div className="p-2.5 bg-red-500/15 rounded-xl border border-red-500/25 text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="glass-card-app rounded-3xl p-6 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#5B4B7C] uppercase tracking-wider block">Passed</span>
            <span className="text-2xl font-extrabold text-[#1E1235] mt-2 block font-mono">{passedCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Cleared inspections</span>
          </div>
          <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/25 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Library Table - Light Glass Card */}
      <div className="glass-card-app rounded-3xl overflow-hidden">
        <div className="p-4 bg-white/40 border-b border-white/60 flex justify-between items-center backdrop-blur-md">
          <h3 className="text-xs font-extrabold text-[#1E1235] uppercase tracking-wider">Asset Library</h3>
          {loading && <span className="text-[10px] text-[#6D28D9] font-semibold animate-pulse">Loading...</span>}
        </div>
        
        {assets.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-[#5B4B7C]">No assets registered. Click Upload Asset to add one.</div>
        ) : (
          <div className="divide-y divide-white/50">
            {assets.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-[#8B5CF6]/15 rounded-xl border border-[#8B5CF6]/25 text-[#6D28D9]">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1E1235]">{item.name}</h4>
                    <p className="text-[10px] text-[#5B4B7C] mt-0.5 font-medium">
                      {item.infrastructureType} • {item.location}
                      {item.assignedTo && (
                        <> • Assigned to {team.find((m) => m.id === item.assignedTo)?.name || "Unknown"}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 text-[10px]">
                  <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    item.status === "Passed" ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30" : "bg-red-500/15 text-red-700 border border-red-500/30"
                  }`}>
                    {item.status}
                  </span>

                  <a
                    href={buildGoogleCalendarLink(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.nextAppointmentDate ? `Next appointment: ${new Date(item.nextAppointmentDate).toLocaleString()}` : "Schedule next appointment"}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white/70 rounded-xl border border-white/80 text-[#6D28D9] hover:bg-white transition-all shadow-sm font-semibold"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    {item.nextAppointmentDate
                      ? new Date(item.nextAppointmentDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : "Schedule"}
                  </a>

                  {item.gDriveLink ? (
                    <a
                      href={item.gDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Google Drive Folder"
                      className="p-2 bg-white/70 rounded-xl border border-white/80 text-[#6D28D9] hover:bg-white transition-all flex items-center justify-center shadow-sm"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      title="No Google Drive Link"
                      className="p-2 bg-white/40 rounded-xl border border-white/40 text-gray-400 cursor-not-allowed flex items-center justify-center"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onInspectAsset(item)}
                    title="Inspect Asset"
                    className="p-2 bg-white/70 rounded-xl border border-white/80 text-[#1E1235] hover:bg-white hover:text-[#6D28D9] transition-all flex items-center justify-center shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    title="Edit Asset"
                    className="p-2 bg-white/70 rounded-xl border border-white/80 text-[#1E1235] hover:bg-white hover:text-[#6D28D9] transition-all flex items-center justify-center shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete Asset"
                    className="p-2 bg-red-500/15 rounded-xl border border-red-500/25 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload/Edit Modal - Light Glassmorphism */}
      {isModalOpen && (
        <div className="fixed -top-20 -bottom-20 -left-20 -right-20 bg-[#1E1235]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-lg glass-modal rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#5B4B7C] hover:text-[#1E1235] z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold text-[#1E1235] px-6 pt-6 pb-4 flex-shrink-0">
              {currentAsset ? "Edit Infrastructure Asset" : "Upload New Asset"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 overflow-y-auto">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Asset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mumbai Tunnel Segment"
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Infrastructure Type</label>
                <select
                  value={infrastructureType}
                  onChange={(e) => setInfrastructureType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                >
                  <option value="Bridge">Bridge</option>
                  <option value="Road">Road</option>
                  <option value="Building">Building</option>
                  <option value="Wind Turbine">Wind Turbine</option>
                  <option value="Solar Farm">Solar Farm</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai Project Site"
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Google Drive Folder Link</label>
                <input
                  type="url"
                  value={gDriveLink}
                  onChange={(e) => setGDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Google Maps Link</label>
                <input
                  type="url"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=19.076,72.877"
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                />
                <p className="text-[10px] text-[#5B4B7C]">Used to pin this asset on the Map Overview.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Assigned To</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                >
                  <option value="">Unassigned</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Inspection Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                >
                  <option value="Passed">Passed</option>
                  <option value="Action Required">Action Required</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Next Appointment Date</label>
                <input
                  type="datetime-local"
                  value={nextAppointmentDate}
                  onChange={(e) => setNextAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/70 border border-white/90 rounded-xl text-xs text-[#1E1235] focus:outline-none focus:border-[#6D28D9] transition-colors"
                />
                <p className="text-[10px] text-[#5B4B7C]">Powers the "Schedule" button that opens a pre-filled Google Calendar event.</p>
              </div>

              <div className="pt-4 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-white/80 text-[#1E1235] rounded-xl text-xs font-semibold hover:bg-white/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#C4BDF3] text-[#4C1D95] font-bold rounded-xl text-xs hover:bg-[#B3AAF0] transition-all shadow-md"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
