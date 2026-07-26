"use client";

import { motion } from "framer-motion";

const steps = [
  "Preparing analysis",
  "Processing input",
  "Analyzing visual hierarchy",
  "Evaluating accessibility",
  "Evaluating usability",
  "Evaluating cognitive load",
  "Generating UX recommendations",
  "Preparing report",
];

interface LoadingScreenProps {
  currentStep: number;
}

export function LoadingScreen({ currentStep }: LoadingScreenProps) {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-accent/10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>

      <h2 className="text-xl font-bold mb-2">Analyzing Your UX</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Our AI is evaluating your design across multiple UX dimensions.
      </p>

      <div className="space-y-3 text-left">
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                  ? "bg-accent text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${
                i <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
