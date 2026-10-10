import { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  X,
  Folder,
  ClipboardCheck,
  Users,
  CheckCircle2,
  Activity,
  Mail,
  Sparkles,
  Layers
} from "lucide-react";
import { API_BASE_URL } from "../config";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Asset {
  id: string;
  assignedTo?: string | null;
}

interface Inspection {
  id: string;
  assetId: string;
}

const ROLES = [
  "Administrator",
  "Quality Analyst",
  "Drone Pilot (FAA Part 107)",
  "BIM Engineer",
  "Viewer"
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamView() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [status, setStatus] = useState("Active");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [teamRes, assetsRes, inspectionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/team`),
        fetch(`${API_BASE_URL}/assets`),
        fetch(`${API_BASE_URL}/api/inspections`)
      ]);
      setMembers(await teamRes.json());
      setAssets(await assetsRes.json());
      setInspections(await inspectionsRes.json());
    } catch (err) {
      console.error("Error fetching team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const assetsByMember = useMemo(() => {
    const map = new Map<string, Asset[]>();
    assets.forEach((a) => {
      if (!a.assignedTo) return;
      map.set(a.assignedTo, [...(map.get(a.assignedTo) || []), a]);
    });
    return map;
  }, [assets]);

  const inspectionsByAsset = useMemo(() => {
    const map = new Map<string, number>();
    inspections.forEach((i) => {
      map.set(i.assetId, (map.get(i.assetId) || 0) + 1);
    });
    return map;
  }, [inspections]);

  const statsFor = (memberId: string) => {
    const memberAssets = assetsByMember.get(memberId) || [];
    const inspectionCount = memberAssets.reduce(
      (sum, a) => sum + (inspectionsByAsset.get(a.id) || 0),
      0
    );
    return { assetCount: memberAssets.length, inspectionCount };
  };

  const overviewStats = useMemo(() => {
    const activeCount = members.filter((m) => m.status === "Active").length;
    const totalAssignedAssets = assets.filter((a) => a.assignedTo).length;
    const totalRuns = inspections.length;
    return {
      total: members.length,
      active: activeCount,
      assignedAssets: totalAssignedAssets,
      runs: totalRuns
    };
  }, [members, assets, inspections]);

  const handleOpenAddModal = () => {
    setCurrentMember(null);
    setName("");
    setEmail("");
    setRole(ROLES[0]);
    setStatus("Active");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: TeamMember) => {
    setCurrentMember(member);
    setName(member.name);
    setEmail(member.email);
    setRole(member.role);
    setStatus(member.status);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await fetch(`${API_BASE_URL}/team/${id}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, email, role, status };
    try {
      if (currentMember?.id) {
        await fetch(`${API_BASE_URL}/team/${currentMember.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${API_BASE_URL}/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      fetchAll();
    } catch (err) {
      console.error("Error saving member:", err);
    }
  };

  return (
    <div className="space-y-8 text-left relative">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#6D28D9] text-xs font-bold mb-2 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Organization Management</span>
          </div>
          <h2 className="text-3xl font-black text-[#1E1235] tracking-tight">Team & Roles</h2>
          <p className="text-xs text-[#5B4B7C] mt-1 font-medium max-w-xl">
            Manage infrastructure inspect team members, assign asset scopes, and allocate role permissions across the sky audit platform.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#A78BFA] text-white text-xs font-extrabold rounded-2xl transition-all shadow-[0_6px_20px_rgba(109,40,217,0.35)] hover:shadow-[0_10px_28px_rgba(109,40,217,0.5)] hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Top Glass Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card-team rounded-3xl p-4 sm:p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-[#8B5CF6]/25 shrink-0 ring-2 ring-white/70">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#5B4B7C] uppercase tracking-wider">Total Members</div>
            <div className="text-2xl font-black text-[#1E1235] mt-0.5">{overviewStats.total}</div>
          </div>
        </div>

        <div className="glass-card-team rounded-3xl p-4 sm:p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 ring-2 ring-white/70">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#5B4B7C] uppercase tracking-wider">Active Personnel</div>
            <div className="text-2xl font-black text-[#1E1235] mt-0.5">{overviewStats.active}</div>
          </div>
        </div>

        <div className="glass-card-team rounded-3xl p-4 sm:p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#C4BDF3] text-white flex items-center justify-center shadow-lg shadow-[#8B5CF6]/25 shrink-0 ring-2 ring-white/70">
            <Layers className="w-6 h-6 text-[#1E1235]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#5B4B7C] uppercase tracking-wider">Assigned Assets</div>
            <div className="text-2xl font-black text-[#1E1235] mt-0.5">{overviewStats.assignedAssets}</div>
          </div>
        </div>

        <div className="glass-card-team rounded-3xl p-4 sm:p-5 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0 ring-2 ring-white/70">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#5B4B7C] uppercase tracking-wider">Total Inspection Runs</div>
            <div className="text-2xl font-black text-[#1E1235] mt-0.5">{overviewStats.runs}</div>
          </div>
        </div>
      </div>

      {/* Team Member Glass Cards Grid */}
      {loading ? (
        <div className="glass-card-team rounded-3xl p-12 text-center text-[#5B4B7C] font-semibold">
          <div className="inline-block w-8 h-8 border-3 border-[#6D28D9] border-t-transparent rounded-full animate-spin mb-3"></div>
          <div>Loading team roster & glass card views...</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => {
            const { assetCount, inspectionCount } = statsFor(m.id);
            const isActive = m.status === "Active";
            return (
              <div key={m.id} className="glass-card-team rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  {/* Avatar & Status Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6D28D9] via-[#8B5CF6] to-[#C4BDF3] text-white font-black text-sm flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30 ring-2 ring-white/80 shrink-0">
                      {initialsOf(m.name)}
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full backdrop-blur-md flex items-center space-x-1.5 shadow-sm ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-800 border border-emerald-500/35"
                          : "bg-amber-500/15 text-amber-800 border border-amber-500/35"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      <span>{m.status}</span>
                    </span>
                  </div>

                  {/* Name & Contact Info */}
                  <h3 className="text-base font-extrabold text-[#1E1235] tracking-tight">{m.name}</h3>
                  <div className="flex items-center space-x-1.5 text-[11px] text-[#5B4B7C] font-medium mt-1">
                    <Mail className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>

                  {/* Role Glass Pill */}
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6]/20 via-[#C4BDF3]/30 to-[#8B5CF6]/15 text-[#4C1D95] border border-[#8B5CF6]/35 text-xs font-extrabold mt-4 shadow-sm backdrop-blur-md">
                    <Shield className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>{m.role}</span>
                  </div>
                </div>

                {/* Inner Glass Stats Panel & Action Buttons */}
                <div className="mt-6 glass-inner-panel rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 text-xs text-[#4A3B69] font-bold">
                    <span
                      className="flex items-center space-x-1.5 bg-white/50 px-2.5 py-1 rounded-xl border border-white/70 shadow-sm"
                      title="Assigned Infrastructure Assets"
                    >
                      <Folder className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span>{assetCount} assets</span>
                    </span>
                    <span
                      className="flex items-center space-x-1.5 bg-white/50 px-2.5 py-1 rounded-xl border border-white/70 shadow-sm"
                      title="Total Inspection Runs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      <span>{inspectionCount} runs</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="p-2 bg-white/70 hover:bg-white border border-white/90 text-[#1E1235] hover:text-[#6D28D9] rounded-xl transition-all shadow-sm hover:shadow"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite/Edit Glass Modal */}
      {isModalOpen && (
        <div className="fixed -top-20 -bottom-20 -left-20 -right-20 bg-[#1E1235]/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md glass-modal rounded-3xl p-7 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-white/50 border border-white/80 text-[#5B4B7C] hover:text-[#1E1235] hover:bg-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] text-white flex items-center justify-center shadow-md">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1E1235]">
                  {currentMember ? "Edit Team Member" : "Invite Team Member"}
                </h3>
                <p className="text-xs text-[#5B4B7C] font-medium">
                  {currentMember
                    ? "Update personnel roles and operational status."
                    : "Send an invitation to join your drone inspection workspace."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] placeholder-[#5B4B7C]/50 focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@firm.com"
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] placeholder-[#5B4B7C]/50 focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#5B4B7C]">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/60 border border-white/90 rounded-xl text-xs font-semibold text-[#1E1235] focus:outline-none focus:bg-white focus:border-[#6D28D9] transition-all backdrop-blur-md"
                >
                  <option value="Active">Active</option>
                  <option value="Invited">Invited</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/60 border border-white/90 text-[#1E1235] rounded-xl text-xs font-bold hover:bg-white transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-extrabold rounded-xl text-xs hover:from-[#5B21B6] hover:to-[#7C3AED] transition-all shadow-lg shadow-[#8B5CF6]/30"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
