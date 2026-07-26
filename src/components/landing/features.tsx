"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Accessibility,
  MousePointer,
  Layers,
  Zap,
  DollarSign,
  Lightbulb,
  Code2,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI UX Analysis",
    description:
      "Leverage advanced AI to evaluate your digital products across multiple UX dimensions automatically.",
  },
  {
    icon: Accessibility,
    title: "Accessibility Evaluation",
    description:
      "Identify accessibility issues including color contrast, typography readability, and keyboard navigation concerns.",
  },
  {
    icon: MousePointer,
    title: "Usability Analysis",
    description:
      "Evaluate ease of use, navigation, discoverability, and user flow with AI-driven insights.",
  },
  {
    icon: Layers,
    title: "Visual Hierarchy",
    description:
      "Assess CTA visibility, typography hierarchy, spacing, alignment, and content grouping.",
  },
  {
    icon: DollarSign,
    title: "Cognitive Load",
    description:
      "Analyze information density, confusing content, and complex workflows that overwhelm users.",
  },
  {
    icon: Zap,
    title: "Interaction Cost",
    description:
      "Measure unnecessary actions, repetitive interactions, and navigation complexity.",
  },
  {
    icon: Lightbulb,
    title: "AI Recommendations",
    description:
      "Receive prioritized, actionable recommendations categorized by impact and implementation difficulty.",
  },
  {
    icon: Code2,
    title: "Improved Frontend Code",
    description:
      "Generate improved frontend code based on identified UX issues, ready to copy or download.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description:
      "Export comprehensive UX reports with scores, issues, and recommendations in a professional format.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything You Need for UX Excellence
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete toolkit for evaluating and improving the user experience
            of your digital products.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-2xl border border-border bg-white dark:bg-muted/30 hover:border-accent/30 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
