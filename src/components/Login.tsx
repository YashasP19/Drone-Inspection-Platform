import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  LockKeyhole,
  Clock,
  Users,
  ShieldAlert,
} from "lucide-react";
import { LogoIcon } from "./Header";
import bridgeImg from "../assets/login_bridge.png";

interface LoginProps {
  onLoginSuccess: (email: string) => void;
  onBackToHome: () => void;
}

interface DefectPoint {
  id: number;
  top: string;
  left: string;
  title: string;
  subtitle: string;
  badge: string;
  severity: "high" | "medium" | "low";
}

const DEFECT_POINTS: DefectPoint[] = [
  {
    id: 1,
    top: "45%",
    left: "48%",
    title: "Defects: 2, Bridge Pier",
    subtitle: "YOLOv8 detected concrete spalling & vertical crack",
    badge: "96% Confidence",
    severity: "high",
  },
  {
    id: 2,
    top: "35%",
    left: "75%",
    title: "Micro-cracks: 4, Upper Truss",
    subtitle: "Surface stress fracture on steel junction",
    badge: "89% Confidence",
    severity: "medium",
  },
  {
    id: 3,
    top: "70%",
    left: "45%",
    title: "Foundation Check: Pass",
    subtitle: "Pier base integrity within nominal threshold",
    badge: "99% Normal",
    severity: "low",
  },
];

export default function Login({ onLoginSuccess, onBackToHome }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("admin@droneinspector.com");
  const [password, setPassword] = useState("admin123");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePoint, setActivePoint] = useState<DefectPoint | null>(DEFECT_POINTS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (!email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 3) {
        setError("Password must be at least 3 characters.");
        return;
      }

      onLoginSuccess(email);
    }, 800);
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError("Please type your email address first.");
      return;
    }
    setError("");
    setSuccessMessage(`Password reset link sent to ${email}`);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const handleQuickDemoFill = () => {
    setEmail("admin@droneinspector.com");
    setPassword("admin123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#140F23] text-[#E2DEFA] flex flex-col justify-between px-4 sm:px-6 py-4 relative overflow-x-hidden">
      {/* Background Soft Ambient Purple Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#6D28D9]/25 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between z-20 pt-2 pb-2">
        <button
          onClick={onBackToHome}
          className="flex items-center space-x-2 text-white/90 hover:text-white font-extrabold text-lg sm:text-xl tracking-wider group focus:outline-none"
        >
          <LogoIcon className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-105 transition-transform" />
          <span>
            SKY<span className="text-[#C4BDF3]">AUDIT</span>
          </span>
        </button>

        <button
          onClick={onBackToHome}
          className="flex items-center space-x-2 text-xs font-semibold text-[#C4BDF3] hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full border border-white/20 transition-all backdrop-blur-xl shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Container - Compact 2 Column Glass Grid */}
      <main className="max-w-5xl w-full mx-auto my-auto py-2 z-10">
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* LHS Form Box - Short Light Frosted Glassmorphism Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 bg-white/[0.08] border border-white/25 rounded-3xl p-6 sm:p-7 backdrop-blur-2xl shadow-[0_20px_50px_rgba(76,29,149,0.25)] flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Light Accent Reflection */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A78BFA] via-[#C4BDF3] to-[#8B5CF6] opacity-80" />

            <div>
              {/* Header inside Form */}
              <div className="space-y-1.5 mb-5">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[#E2DEFA] text-[11px] font-semibold backdrop-blur-md">
                  <Sparkles className="w-3 h-3 text-[#C4BDF3]" />
                  <span>{isSignUp ? "Create Workspace Account" : "Secure Infrastructure Portal"}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  {isSignUp ? "Join " : "Welcome back to "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C4BDF3] via-[#E2DEFA] to-[#A78BFA]">
                    SKYAUDIT
                  </span>
                </h1>
              </div>

              {/* Status Notifications */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-500/20 border border-red-400/40 text-red-200 rounded-xl text-xs flex items-center space-x-2.5 backdrop-blur-md"
                >
                  <ShieldAlert className="w-4 h-4 text-red-300 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 rounded-xl text-xs flex items-center space-x-2.5 backdrop-blur-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {/* Compact Dynamic Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isSignUp && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#E2DEFA]">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4BDF3]/70" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#120B26]/80 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#C4BDF3] focus:ring-1 focus:ring-[#C4BDF3] transition-all backdrop-blur-md"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#E2DEFA]">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4BDF3]/70" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@droneinspector.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#120B26]/80 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#C4BDF3] focus:ring-1 focus:ring-[#C4BDF3] transition-all backdrop-blur-md"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-semibold text-[#E2DEFA]">Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[11px] text-[#C4BDF3] hover:text-white transition-colors"
                      >
                        forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C4BDF3]/70" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2.5 bg-[#120B26]/80 border border-white/20 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#C4BDF3] focus:ring-1 focus:ring-[#C4BDF3] transition-all backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C4BDF3]/70 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white font-bold rounded-full text-xs shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_25px_rgba(139,92,246,0.6)] transition-all flex justify-center items-center space-x-2 mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isSignUp ? "Create Account & Sign In" : "Sign In"}</span>
                  )}
                </motion.button>
              </form>

              {/* Bottom Toggle & Auto Fill */}
              <div className="mt-4 text-center space-y-2">
                <p className="text-[11px] text-[#C4BDF3]/90">
                  {isSignUp ? "Already have an account? " : "Don't have an account? "}
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                    className="text-white font-bold underline underline-offset-2 hover:text-[#C4BDF3] transition-colors"
                  >
                    [{isSignUp ? "Sign In" : "Request Demo"}]
                  </button>
                </p>

                <div>
                  <button
                    onClick={handleQuickDemoFill}
                    className="text-[10px] font-mono text-[#C4BDF3]/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md border border-white/15 transition-colors backdrop-blur-md"
                  >
                    🔑 Quick Fill Admin (admin@droneinspector.com / admin123)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RHS Visual Box - Short Light Frosted Glassmorphism Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-6 bg-white/[0.08] border border-white/25 rounded-3xl p-5 sm:p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(76,29,149,0.25)] flex flex-col justify-between relative overflow-hidden"
          >
            {/* Pill Header Badge */}
            <div className="flex justify-start items-center z-20 mb-3">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C4BDF3]" />
                <span>Securely Access Your Infrastructure Data</span>
              </div>
            </div>

            {/* Bridge Image Box - Compact Height */}
            <div className="relative w-full h-[230px] sm:h-[260px] rounded-2xl overflow-hidden border border-white/20 bg-[#0F091F] flex items-center justify-center shadow-inner">
              <img
                src={bridgeImg}
                alt="Bridge CAD Infrastructure Inspection"
                className="w-full h-full object-cover brightness-95 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#140F23] via-transparent to-transparent opacity-75" />

              {/* Interactive White & Yellow Pulsing Dots */}
              {DEFECT_POINTS.map((pt) => {
                const isActive = activePoint?.id === pt.id;
                return (
                  <div
                    key={pt.id}
                    style={{ top: pt.top, left: pt.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                    onMouseEnter={() => setActivePoint(pt)}
                    onClick={() => setActivePoint(pt)}
                  >
                    {/* Glowing Ping Aura */}
                    <span className="absolute inline-flex h-6 w-6 -top-1 -left-1 rounded-full bg-amber-300/40 animate-ping" />

                    {/* Core Pulsing Point */}
                    <span
                      className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white shadow-[0_0_12px_#FFD700] transition-all duration-300 ${isActive ? "bg-amber-300 scale-125" : "bg-white scale-100"
                        }`}
                    />
                  </div>
                );
              })}

              {/* Hover Tooltip Card on Active Dot */}
              <AnimatePresence mode="wait">
                {activePoint && (
                  <motion.div
                    key={activePoint.id}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-3 right-3 z-30 bg-[#1A1032]/95 border border-[#8B5CF6]/50 rounded-xl p-3 backdrop-blur-2xl shadow-2xl text-left max-w-[220px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <span className="text-[11px] font-bold text-white flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                        <span>{activePoint.title}</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[#C4BDF3]/85 leading-tight">
                      {activePoint.subtitle}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Bottom Row - 4 Compact Light Frosted Glass Feature Cards */}
      <footer className="max-w-5xl w-full mx-auto pt-3 pb-1 z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          <div className="bg-white/[0.08] border border-white/20 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl flex flex-col justify-between space-y-1 hover:bg-white/[0.12] hover:border-white/30 transition-all shadow-sm">
            <div className="flex items-center space-x-1.5 text-white font-extrabold text-xs tracking-wider uppercase">
              <LockKeyhole className="w-3.5 h-3.5 text-[#C4BDF3]" />
              <span>SECURE ACCESS</span>
            </div>
            <p className="text-[11px] text-[#C4BDF3]/80">(Single Sign-On, MFA)</p>
          </div>

          <div className="bg-white/[0.08] border border-white/20 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl flex flex-col justify-between space-y-1 hover:bg-white/[0.12] hover:border-white/30 transition-all shadow-sm">
            <div className="flex items-center space-x-1.5 text-white font-extrabold text-xs tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C4BDF3]" />
              <span>DATA PRIVACY</span>
            </div>
            <p className="text-[11px] text-[#C4BDF3]/80">(Encrypted Pipeline)</p>
          </div>

          <div className="bg-white/[0.08] border border-white/20 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl flex flex-col justify-between space-y-1 hover:bg-white/[0.12] hover:border-white/30 transition-all shadow-sm">
            <div className="flex items-center space-x-1.5 text-white font-extrabold text-xs tracking-wider uppercase">
              <Clock className="w-3.5 h-3.5 text-[#C4BDF3]" />
              <span>FULL HISTORY</span>
            </div>
            <p className="text-[11px] text-[#C4BDF3]/80">(Previous Reports)</p>
          </div>

          <div className="bg-white/[0.08] border border-white/20 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl flex flex-col justify-between space-y-1 hover:bg-white/[0.12] hover:border-white/30 transition-all shadow-sm">
            <div className="flex items-center space-x-1.5 text-white font-extrabold text-xs tracking-wider uppercase">
              <Users className="w-3.5 h-3.5 text-[#C4BDF3]" />
              <span>COLLABORATION</span>
            </div>
            <p className="text-[11px] text-[#C4BDF3]/80">(Team Access)</p>
          </div>

        </div>
      </footer>
    </div>
  );
}
