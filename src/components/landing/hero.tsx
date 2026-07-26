"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Eye, MousePointer, Accessibility, Brain, Layers } from "lucide-react";

const previewScores = [
  { label: "UX Score", value: 82, icon: BarChart3, color: "text-blue-500" },
  { label: "Accessibility", value: 75, icon: Accessibility, color: "text-green-500" },
  { label: "Usability", value: 84, icon: MousePointer, color: "text-purple-500" },
  { label: "Visual Hierarchy", value: 88, icon: Layers, color: "text-orange-500" },
  { label: "Cognitive Load", value: 79, icon: Brain, color: "text-pink-500" },
  { label: "Interaction Cost", value: 80, icon: Eye, color: "text-cyan-500" },
];

export function Hero() {
  return (
    <section id="home" className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light text-accent text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              AI-Powered UX Analysis
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              AI-Powered UX Evaluation for Better Digital Experiences
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Analyze websites, applications, screenshots, and user flows with AI.
              Discover UX problems, understand why they matter, and get actionable
              recommendations to improve your digital experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Start UX Analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Learn More
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-border bg-white dark:bg-muted p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  UX Analysis Dashboard
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall UX Score</span>
                  <span className="text-2xl font-bold text-accent">82/100</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "82%" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewScores.map((score, i) => (
                  <motion.div
                    key={score.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                    className="p-3 rounded-xl bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <score.icon className={`w-3.5 h-3.5 ${score.color}`} />
                      <span className="text-[11px] text-muted-foreground">
                        {score.label}
                      </span>
                    </div>
                    <span className="text-lg font-semibold">{score.value}</span>
                  </motion.div>
                ))}
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground text-center">
                UI preview — not actual analysis results
              </p>
            </div>

            <div className="absolute -z-10 inset-0 rounded-2xl bg-gradient-to-br from-accent/10 to-transparent blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
