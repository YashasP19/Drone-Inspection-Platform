import { useState } from "react";
import { Landmark, ArrowRight, Zap, Sun, Route, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import bridgeImg from "../assets/hero_infrastructure.png";
import turbineImg from "../assets/slider_infrastructure.png";
import solarImg from "../assets/solar_inspection.png";
import roadImg from "../assets/road_inspection.png";

type MethodType = "bridges" | "turbines" | "solar" | "roads";

export default function CaptureMethods() {
  const [activeMethod, setActiveMethod] = useState<MethodType>("bridges");

  const methods = {
    bridges: {
      title: "Bridge Inspections",
      tagline: "Spot structural defects before they become closures.",
      desc: "Fly drone passes over piers, girders, and deck undersides. The AI pipeline flags concrete cracks, spalling, corrosion, and misalignment, then scores each finding by severity.",
      icon: Landmark,
      features: [
        "Concrete crack, spalling, and delamination detection",
        "Corrosion and rust flagging on steel elements",
        "Severity-ranked findings with recommended actions",
      ],
      img: bridgeImg,
    },
    turbines: {
      title: "Wind Turbine Inspections",
      tagline: "Catch blade and nacelle damage from the ground up.",
      desc: "Upload blade and nacelle imagery from routine flights. The pipeline identifies leading-edge erosion, cracks, and lightning strike damage without grounding the turbine.",
      icon: Zap,
      features: [
        "Blade erosion and micro-crack detection",
        "Lightning strike and coating damage flags",
        "Confidence-scored defect reports per blade",
      ],
      img: turbineImg,
    },
    solar: {
      title: "Solar Farm Inspections",
      tagline: "Find failing panels before they cost you output.",
      desc: "Thermal and RGB drone passes across panel arrays feed the same pipeline, surfacing hot spots, cracked cells, and wiring faults across thousands of panels in minutes.",
      icon: Sun,
      features: [
        "Hot-spot and cracked-cell detection",
        "Panel-level severity assessment",
        "Fast triage across large arrays",
      ],
      img: solarImg,
    },
    roads: {
      title: "Road Inspections",
      tagline: "Track pavement condition at network scale.",
      desc: "Aerial sweeps of road segments are run through the same defect-detection and severity agents used for structures, surfacing potholes, cracking, and erosion for maintenance planning.",
      icon: Route,
      features: [
        "Pothole and surface crack detection",
        "Erosion and shoulder damage flagging",
        "Prioritized maintenance recommendations",
      ],
      img: roadImg,
    },
  };

  const active = methods[activeMethod];
  const IconComponent = active.icon;

  return (
    <section className="py-24 bg-gradient-to-b from-[#140F23] via-[#1A132E] to-[#120D20] relative overflow-hidden text-[#E2DEFA]">
      {/* Background Soft Periwinkle Ambient Glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#C4BDF3]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-[#8B5CF6]/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 max-w-3xl mx-auto"
        >
          <span className="text-xs font-bold text-[#C4BDF3] uppercase tracking-widest px-3 py-1 rounded-full bg-[#C4BDF3]/10 border border-[#C4BDF3]/20">
            Multi-Asset AI Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            One Pipeline. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C4BDF3] via-[#E2DEFA] to-[#9A8DE6]">Every Asset Type.</span>
          </h2>
          <p className="text-[#D4CEF6] text-base leading-relaxed">
            The same five-agent AI pipeline adapts its detection logic across bridges, wind turbines, solar farms, and roads.
          </p>
        </motion.div>

        {/* Centered Tab Selectors Bar */}
        <div className="flex justify-center border-b border-[#8B5CF6]/20 pb-2 space-x-3 sm:space-x-8 max-w-2xl mx-auto overflow-x-auto">
          {(Object.keys(methods) as MethodType[]).map((key) => {
            const TabIcon = methods[key].icon;
            return (
              <button
                key={key}
                onClick={() => setActiveMethod(key)}
                className={`flex items-center space-x-2 py-3 px-4 font-bold text-sm transition-all whitespace-nowrap rounded-t-xl ${
                  activeMethod === key
                    ? "border-b-2 border-[#6D28D9] text-white bg-white/10 shadow-sm"
                    : "border-transparent text-[#C4BDF3]/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <TabIcon className="w-4 h-4 text-[#C4BDF3]" />
                <span className="capitalize">{key}</span>
              </button>
            );
          })}
        </div>

        {/* Content & Image Grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-stretch">

          {/* Left: Reversed Periwinkle Lavender Wave Gradient Box */}
          <motion.div
            key={activeMethod}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 bg-[radial-gradient(circle_at_100%_100%,#B8AFEE_0%,#C5BEF0_45%,#FAF8FF_100%)] border border-[#8B5CF6]/35 rounded-3xl p-6 sm:p-8 text-[#1A1032] shadow-[0_15px_40px_rgba(76,29,149,0.25)] flex flex-col justify-between relative overflow-hidden"
          >
            <div className="space-y-6 text-left">
              <div className="flex items-center space-x-3 border-b border-[#8B5CF6]/20 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center text-white shadow-md">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-[#1E1235]">{active.title}</h3>
                  <p className="text-[#6D28D9] text-xs font-bold mt-0.5">{active.tagline}</p>
                </div>
              </div>

              <p className="text-[#4A3B69] leading-relaxed text-sm font-medium">{active.desc}</p>

              <ul className="grid gap-3 pt-1">
                {active.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center space-x-3 text-sm text-[#362758] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#6D28D9] flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 border-t border-[#8B5CF6]/20 mt-6">
              <a
                href="#pricing"
                className="inline-flex items-center space-x-2 text-sm font-extrabold text-[#6D28D9] hover:text-[#4C1D95] transition-colors group"
              >
                <span>Learn more about {activeMethod} inspections</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>

          {/* Right: Section Specific Aerial Drone Inspection Image Panel (Using Local Asset) */}
          <motion.div
            key={`img-${activeMethod}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 relative flex"
          >
            <div className="absolute inset-0 bg-[#C4BDF3]/25 rounded-3xl filter blur-2xl pointer-events-none" />
            <div className="relative w-full border border-[#C4BDF3]/30 rounded-3xl overflow-hidden shadow-2xl bg-[#1A142D] flex flex-col justify-between aspect-[16/10] min-h-[340px] max-h-[380px]">
              <img
                src={active.img}
                alt={active.title}
                className="w-full h-full object-cover brightness-95 contrast-105 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#140F23] via-transparent to-transparent pointer-events-none" />

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#140F23]/90 border border-[#C4BDF3]/30 rounded-2xl p-3.5 backdrop-blur-md flex items-center space-x-3 text-white">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6D28D9] to-[#8B5CF6] flex items-center justify-center text-white shadow-md">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-[#C4BDF3] font-bold uppercase tracking-wider">PIPELINE STAGE</div>
                  <div className="text-xs font-semibold text-white">Image Analysis → Defect Detection → Severity → Report</div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
