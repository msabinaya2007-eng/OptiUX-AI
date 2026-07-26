"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, Eye, Rocket } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Provide Your Design",
    description:
      "Upload screenshots, share a video, or enter a website URL. Add context about your product and target audience.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Analyzes Your UX",
    description:
      "Our AI evaluates your design across accessibility, usability, visual hierarchy, cognitive load, and interaction cost.",
  },
  {
    icon: Eye,
    step: "03",
    title: "Review UX Insights",
    description:
      "Explore detailed scores, identified issues with severity ratings, strengths, and prioritized recommendations.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Improve Your Interface",
    description:
      "Get AI-generated improved code, export PDF reports, and implement changes that measurably improve UX.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From input to actionable insights in four simple steps.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
              )}

              <div className="relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-white dark:bg-muted border border-border flex items-center justify-center shadow-sm">
                <step.icon className="w-8 h-8 text-accent" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
