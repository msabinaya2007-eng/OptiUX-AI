"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Target } from "lucide-react";

export function About() {
  return (
    <section id="about" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              About OptiUX-AI
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              OptiUX-AI helps developers and designers identify UX problems
              using AI-powered analysis. Whether you have a live website,
              design screenshots, or user flow videos, our AI evaluates your
              product across five critical UX dimensions.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              We believe great user experiences are measurable. By combining
              AI analysis with established UX heuristics, OptiUX-AI gives you
              the insights you need to build interfaces that truly work for
              your users.
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: "Privacy First", desc: "All analysis happens in your browser session" },
                { icon: Zap, title: "Fast Results", desc: "Get comprehensive UX reports in minutes" },
                { icon: Target, title: "Actionable", desc: "Every finding comes with clear recommendations" },
              ].map((item) => (
                <div key={item.title}>
                  <item.icon className="w-5 h-5 text-accent mb-2" />
                  <h4 className="text-sm font-semibold mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-muted to-accent/5 border border-border p-8 flex flex-col justify-center">
              <div className="space-y-4">
                {[
                  { label: "Websites Analyzed", value: "500+" },
                  { label: "Issues Detected", value: "12,000+" },
                  { label: "UX Improvements", value: "3,200+" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-background border border-border">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="text-xl font-bold">{stat.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground text-center">
                Illustrative — not live metrics
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
