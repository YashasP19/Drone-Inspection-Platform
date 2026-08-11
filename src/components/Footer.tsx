import { motion } from "framer-motion";
import { LogoIcon } from "./Header";

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="bg-[#0B0816] border-t border-[#8B5CF6]/20 pt-20 pb-10 text-[#E2DEFA] relative overflow-hidden"
    >
      {/* Background Soft Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#C4BDF3]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-12 text-left relative z-10">

        {/* Brand column */}
        <div className="col-span-2 space-y-6">
          <a href="#" className="flex items-center space-x-2 text-white font-extrabold text-2xl tracking-wider">
            <LogoIcon className="w-8 h-8" />
            <span>
              SKY<span className="text-[#C4BDF3]">AUDIT</span>
            </span>
          </a>
          <p className="text-[#C4BDF3]/80 text-xs leading-relaxed max-w-sm">
            Sky Audit runs drone imagery through a multi-agent AI pipeline to detect infrastructure defects and generate inspection reports — fast, consistent, and severity-ranked.
          </p>
          <div className="text-[10px] text-[#C4BDF3]/60">
            © 2026 Sky Audit. All rights reserved.
          </div>
        </div>

        {/* Links Column 1 */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Platform</h5>
          <ul className="space-y-2 text-xs text-[#C4BDF3]/80">
            <li><a href="#products" className="hover:text-white transition-colors">Asset Management</a></li>
            <li><a href="#products" className="hover:text-white transition-colors">Live Agent Pipeline</a></li>
            <li><a href="#products" className="hover:text-white transition-colors">Defect Detection</a></li>
            <li><a href="#products" className="hover:text-white transition-colors">Inspection Reports</a></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Solutions</h5>
          <ul className="space-y-2 text-xs text-[#C4BDF3]/80">
            <li><a href="#solutions" className="hover:text-white transition-colors">Bridges</a></li>
            <li><a href="#solutions" className="hover:text-white transition-colors">Wind Turbines</a></li>
            <li><a href="#solutions" className="hover:text-white transition-colors">Solar Farms</a></li>
            <li><a href="#solutions" className="hover:text-white transition-colors">Roads & Highways</a></li>
          </ul>
        </div>

        {/* Links Column 3 */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-white uppercase tracking-wider">Company</h5>
          <ul className="space-y-2 text-xs text-[#C4BDF3]/80">
            <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            <li><a href="#pricing" className="hover:text-white transition-colors">Documentation</a></li>
            <li><a href="#pricing" className="hover:text-white transition-colors">Security & Privacy</a></li>
            <li><a href="#pricing" className="hover:text-white transition-colors">Contact Support</a></li>
          </ul>
        </div>

      </div>
    </motion.footer>
  );
}
