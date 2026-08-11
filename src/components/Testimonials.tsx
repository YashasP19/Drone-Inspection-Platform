import { Check } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "$20",
    period: "/mo",
    description: "For small teams running occasional inspections.",
    features: [
      "Up to 10 inspections / month",
      "Single-agent defect detection",
      "Markdown report exports",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$50",
    period: "/mo",
    description: "For infrastructure teams running the full pipeline at scale.",
    features: [
      "Unlimited inspections",
      "Full 5-agent LangGraph pipeline",
      "Live agent status streaming",
      "Google Calendar integration",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$100",
    period: "/mo",
    description: "For organizations with multi-site fleets and compliance needs.",
    features: [
      "Everything in Professional",
      "Dedicated onboarding",
      "Custom severity thresholds",
      "SSO & team management",
      "SLA-backed support",
    ],
    highlighted: false,
  },
];

export default function Testimonials() {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-[#120D20] via-[#1A132E] to-[#140F23] text-[#E2DEFA] border-t border-[#8B5CF6]/15 relative overflow-hidden">
      {/* Background Soft Periwinkle Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C4BDF3]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Title Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 mb-16"
        >
          <span className="text-xs font-bold text-[#C4BDF3] uppercase tracking-widest px-3 py-1 rounded-full bg-[#C4BDF3]/10 border border-[#C4BDF3]/20">
            Transparent Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Simple, Transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C4BDF3] via-[#E2DEFA] to-[#9A8DE6]">Pricing</span>
          </h2>
          <p className="text-[#D4CEF6] max-w-xl mx-auto text-sm sm:text-base">
            Choose the plan that fits your inspection workload. Cancel anytime.
          </p>
        </motion.div>

        {/* Crisp White/Light Periwinkle Gradient Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`group rounded-3xl p-8 flex flex-col relative cursor-pointer backdrop-blur-xl ${plan.highlighted
                  ? "pricing-card-highlighted shadow-2xl md:scale-105"
                  : "pricing-card shadow-lg"
                }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-1 rounded-full shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-extrabold text-[#1E1235] transition-colors duration-300 group-hover:text-[#6D28D9]">
                {plan.name}
              </h3>
              <p className="text-xs mt-1 text-[#4A3B69] font-medium">
                {plan.description}
              </p>

              <div className="flex items-end mt-6 mb-6">
                <span className="text-4xl font-extrabold text-[#1E1235]">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm ml-1 mb-1 text-[#6D28D9] font-bold">
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="space-y-3 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#6D28D9]" />
                    <span className="text-sm text-[#362758] font-medium transition-colors">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button className="mt-8 w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] text-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_4px_25px_rgba(109,40,217,0.4)]">
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
