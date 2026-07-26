"use client";

import { useAnalysis } from "@/lib/analysis-context";
import { Zap, TrendingUp, Clock } from "lucide-react";

export function Recommendations() {
  const { currentSession } = useAnalysis();
  const result = currentSession?.result;
  if (!result || result.recommendations.length === 0) return null;

  const quickWins = result.recommendations.filter(
    (r) => r.impact === "Medium"
  );
  const highImpact = result.recommendations.filter((r) => r.impact === "High");
  const longTerm = result.recommendations.filter((r) => r.impact === "Low");

  const sections = [
    {
      title: "Quick Wins",
      desc: "Simple improvements that can be implemented quickly",
      items: quickWins,
      icon: Zap,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "High Impact",
      desc: "Changes that significantly improve UX",
      items: highImpact,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Long-Term Improvements",
      desc: "Larger structural improvements",
      items: longTerm,
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Recommendations</h3>

      <div className="space-y-6">
        {sections.map((section) =>
          section.items.length > 0 ? (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}
                >
                  <section.icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{section.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {section.desc}
                  </p>
                </div>
              </div>
              <div className="space-y-2 ml-10">
                {section.items.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-border bg-white dark:bg-muted/30"
                  >
                    <h5 className="text-sm font-medium mb-1">{rec.title}</h5>
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
