import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  onSignInClick: () => void;
  isLoggedIn: boolean;
  onSignOut: () => void;
}

export function LogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-tr from-[#6D28D9] via-[#8B5CF6] to-[#C4BDF3] p-[1.5px] shadow-[0_0_15px_rgba(109,40,217,0.4)] flex-shrink-0`}>
      <div className="w-full h-full bg-[#1E1235] rounded-[10px] flex items-center justify-center p-1.5">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#C4BDF3]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4M12 16v4M8 12H4M16 12h4" stroke="#C4BDF3" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" className="fill-[#6D28D9] stroke-[#C4BDF3]" strokeWidth="1.5" />
          <circle cx="12" cy="4" r="2" className="stroke-[#E2DEFA]" strokeWidth="1.5" />
          <circle cx="12" cy="20" r="2" className="stroke-[#E2DEFA]" strokeWidth="1.5" />
          <circle cx="4" cy="12" r="2" className="stroke-[#E2DEFA]" strokeWidth="1.5" />
          <circle cx="20" cy="12" r="2" className="stroke-[#E2DEFA]" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

export default function Header({ onSignInClick, isLoggedIn, onSignOut }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ["products", "solutions", "pricing"];
      const scrollPosition = window.scrollY + 250;

      let current = "home";

      if (window.scrollY < 250) {
        current = "home";
      } else {
        for (const id of sections) {
          const el = document.getElementById(id);
          if (el) {
            const top = el.offsetTop - 150;
            const bottom = top + el.offsetHeight;
            if (scrollPosition >= top && scrollPosition <= bottom) {
              current = id;
              break;
            }
          }
        }
      }

      setActiveTab(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleScroll);
    };
  }, []);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-5xl w-full bg-white/85 backdrop-blur-xl border border-[#8B5CF6]/20 rounded-full px-4 sm:px-6 py-2.5 shadow-[0_12px_40px_rgba(76,29,149,0.15)] flex items-center justify-between transition-all duration-300 ${isScrolled ? "scale-[0.98] shadow-[0_15px_45px_rgba(76,29,149,0.2)]" : ""
          }`}
      >
        {/* Brand Logo */}
        <motion.a
          href="#"
          onClick={() => setActiveTab("home")}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className="flex items-center space-x-2 text-[#1E1235] font-extrabold text-lg sm:text-xl tracking-wider pl-1"
        >
          <LogoIcon className="w-8 h-8" />
          <span className="hidden sm:inline">
            SKY<span className="bg-gradient-to-r from-[#8B5CF6] via-[#6D28D9] to-[#4C1D95] bg-clip-text text-transparent">AUDIT</span>
          </span>
        </motion.a>

        {/* Floating Capsule Nav Links */}
        <nav className="hidden lg:flex items-center space-x-1 bg-black/5 p-1 rounded-full border border-black/5">
          <a
            href="#"
            onClick={() => setActiveTab("home")}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-300 ${activeTab === "home"
                ? "bg-[#C4BDF3] text-[#1E1235] shadow-sm"
                : "text-[#362758] hover:bg-black/5"
              }`}
          >
            Home
          </a>

          <a
            href="#products"
            onClick={() => setActiveTab("products")}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-300 ${activeTab === "products"
                ? "bg-[#C4BDF3] text-[#1E1235] shadow-sm"
                : "text-[#362758] hover:bg-black/5"
              }`}
          >
            Products
          </a>

          <a
            href="#solutions"
            onClick={() => setActiveTab("solutions")}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-300 ${activeTab === "solutions"
                ? "bg-[#C4BDF3] text-[#1E1235] shadow-sm"
                : "text-[#362758] hover:bg-black/5"
              }`}
          >
            Solutions
          </a>

          <a
            href="#pricing"
            onClick={() => setActiveTab("pricing")}
            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-300 ${activeTab === "pricing"
                ? "bg-[#C4BDF3] text-[#1E1235] shadow-sm"
                : "text-[#362758] hover:bg-black/5"
              }`}
          >
            Pricing
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden lg:flex items-center space-x-3 pr-1">
          {isLoggedIn ? (
            <button
              onClick={onSignOut}
              className="text-[#362758] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onSignInClick}
              className="text-[#362758] hover:text-[#6D28D9] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              Sign In
            </button>
          )}
          <a
            href="#pricing"
            className="px-5 py-2 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold rounded-full text-xs shadow-md transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_20px_rgba(109,40,217,0.35)]"
          >
            Request Demo
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 text-[#362758] hover:text-[#6D28D9] focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Sidebar Floating Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden absolute top-full left-0 right-0 mt-3 bg-white/95 border border-[#8B5CF6]/20 rounded-3xl p-6 flex flex-col space-y-5 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex flex-col space-y-3">
                <a
                  href="#"
                  onClick={() => {
                    setActiveTab("home");
                    setIsOpen(false);
                  }}
                  className={`text-sm font-semibold py-2 px-3 rounded-xl ${activeTab === "home" ? "bg-[#C4BDF3]/40 text-[#1E1235]" : "text-[#1E1235] hover:bg-black/5"
                    }`}
                >
                  Home
                </a>
                <a
                  href="#products"
                  onClick={() => {
                    setActiveTab("products");
                    setIsOpen(false);
                  }}
                  className={`text-sm font-semibold py-2 px-3 rounded-xl ${activeTab === "products" ? "bg-[#C4BDF3]/40 text-[#1E1235]" : "text-[#1E1235] hover:bg-black/5"
                    }`}
                >
                  Products
                </a>
                <a
                  href="#solutions"
                  onClick={() => {
                    setActiveTab("solutions");
                    setIsOpen(false);
                  }}
                  className={`text-sm font-semibold py-2 px-3 rounded-xl ${activeTab === "solutions" ? "bg-[#C4BDF3]/40 text-[#1E1235]" : "text-[#1E1235] hover:bg-black/5"
                    }`}
                >
                  Solutions
                </a>
                <a
                  href="#pricing"
                  onClick={() => {
                    setActiveTab("pricing");
                    setIsOpen(false);
                  }}
                  className={`text-sm font-semibold py-2 px-3 rounded-xl ${activeTab === "pricing" ? "bg-[#C4BDF3]/40 text-[#1E1235]" : "text-[#1E1235] hover:bg-black/5"
                    }`}
                >
                  Pricing
                </a>
              </div>
              <hr className="border-[#8B5CF6]/15" />
              <div className="flex flex-col space-y-2.5">
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsOpen(false);
                    }}
                    className="w-full text-center py-2.5 text-[#1E1235] border border-[#8B5CF6]/25 rounded-full text-xs font-bold"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSignInClick();
                      setIsOpen(false);
                    }}
                    className="w-full text-center py-2.5 text-[#1E1235] border border-[#8B5CF6]/25 rounded-full text-xs font-bold"
                  >
                    Sign In
                  </button>
                )}
                <a
                  href="#pricing"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-bold rounded-full text-xs shadow-md"
                >
                  Request a Demo
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
