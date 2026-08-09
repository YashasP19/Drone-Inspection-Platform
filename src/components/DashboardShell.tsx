import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Folder,
  MessagesSquare,
  ClipboardCheck,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  Sparkles
} from "lucide-react";
import DashboardHome from "./DashboardHome";
import AIDiscussionView from "./AIDiscussionView";
import AssetsView from "./AssetsView";
import InspectionsView from "./InspectionsView";
import ReportsView from "./ReportsView";
import TeamView from "./TeamView";
import { LogoIcon } from "./Header";

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

interface DashboardShellProps {
  userEmail: string;
  onSignOut: () => void;
}

type TabType = "dashboard" | "assets" | "discussion" | "inspections" | "reports" | "team";

export default function DashboardShell({ userEmail, onSignOut }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [inspectedAsset, setInspectedAsset] = useState<Asset | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    { id: "dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { id: "assets" as TabType, label: "Assets", icon: Folder },
    { id: "discussion" as TabType, label: "AI Discussion", icon: MessagesSquare },
    { id: "inspections" as TabType, label: "Inspections", icon: ClipboardCheck },
    { id: "reports" as TabType, label: "Reports", icon: FileText },
    { id: "team" as TabType, label: "Team", icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardHome onViewAllProjects={() => setActiveTab("assets")} />
        );
      case "discussion":
        return <AIDiscussionView />;
      case "assets":
        return (
          <AssetsView
            onInspectAsset={(asset) => {
              setInspectedAsset(asset);
              setActiveTab("inspections");
            }}
          />
        );
      case "inspections":
        return (
          <InspectionsView
            inspectedAsset={inspectedAsset}
            onClearAsset={() => setInspectedAsset(null)}
            onSelectAsset={(asset) => setInspectedAsset(asset)}
          />
        );
      case "reports":
        return <ReportsView />;
      case "team":
        return <TeamView />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#FAF8FF] via-[#F2EEFE] to-[#E6DCFE] text-[#1E1235] flex flex-col md:flex-row relative overflow-hidden">
      {/* Background Vivid Periwinkle & Purple Ambient Glass Glow Orbs */}
      <div className="fixed top-[-10%] left-[20%] w-[650px] h-[650px] bg-[#8B5CF6]/25 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#6D28D9]/20 rounded-full blur-[170px] pointer-events-none" />
      <div className="fixed top-[40%] right-[30%] w-[450px] h-[450px] bg-[#C4BDF3]/40 rounded-full blur-[150px] pointer-events-none" />


      {/* Floating Sparkle Stars */}
      <div className="fixed top-12 left-1/4 pointer-events-none text-white/80 animate-pulse">
        <Sparkles className="w-5 h-5 text-[#8B5CF6]/40" />
      </div>
      <div className="fixed top-1/3 right-1/4 pointer-events-none text-white/80 animate-pulse delay-300">
        <Sparkles className="w-6 h-6 text-[#C4BDF3]/60" />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white/80 border-b border-white/60 backdrop-blur-xl w-full z-30 shadow-sm">
        <div className="flex items-center space-x-2">
          <LogoIcon className="w-7 h-7" />
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#C4BDF3] bg-clip-text text-transparent">
            SKYAUDIT
          </span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-[#4A3B69] hover:text-[#1E1235] focus:outline-none"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Left Navigation Sidebar - Light Frosted Glass */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/70 border-r border-white/80 backdrop-blur-2xl shadow-[0_10px_30px_rgba(109,40,217,0.06)] flex flex-col justify-between p-6 transform transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="hidden md:flex items-center space-x-2 font-extrabold text-lg tracking-tight">
            <LogoIcon className="w-8 h-8" />
            <span className="bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#C4BDF3] bg-clip-text text-transparent">
              SKYAUDIT
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== "inspections") setInspectedAsset(null);
                    setActiveTab(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative ${isActive
                    ? "text-[#4C1D95] bg-[#C4BDF3]/60 border border-[#C4BDF3] shadow-sm shadow-[#8B5CF6]/10 font-bold"
                    : "text-[#4A3B69] hover:text-[#1E1235] hover:bg-white/60"
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#6D28D9]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info & Sign Out */}
        <div className="pt-6 border-t border-white/60 space-y-4">
          <div className="flex items-center space-x-3 px-3 py-2 bg-white/50 border border-white/80 rounded-2xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-full bg-[#C4BDF3] text-[#4C1D95] flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
              {(userEmail || "A").charAt(0).toUpperCase()}
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-xs font-bold text-[#1E1235] truncate">
                {userEmail ? userEmail.split("@")[0] : "Administrator"}
              </div>
              <div className="text-[10px] text-[#6D28D9] font-medium truncate">{userEmail || "admin@droneinspector.com"}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-w-0 min-h-0 z-10">
        {/* Content body */}
        <div className="flex-grow p-6 sm:p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-[#1E1235]/40 backdrop-blur-sm z-30 md:hidden"
        />
      )}
    </div>
  );
}
