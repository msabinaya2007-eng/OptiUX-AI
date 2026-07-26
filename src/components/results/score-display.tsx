"use client";

import { useAnalysis } from "@/lib/analysis-context";
import {
  BarChart3,
  Accessibility,
  MousePointer,
  Layers,
  DollarSign,
  Brain,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const categoryMeta: Record<
  string,
  { label: string; icon: typeof BarChart3; color: string }
> = {
  accessibility: {
    label: "Accessibility",
    icon: Accessibility,
    color: "#16a34a",
  },
  usability: { label: "Usability", icon: MousePointer, color: "#8b5cf6" },
  visualHierarchy: {
    label: "Visual Hierarchy",
    icon: Layers,
    color: "#ea580c",
  },
  interactionCost: {
    label: "Interaction Cost",
    icon: DollarSign,
    color: "#06b6d4",
  },
  cognitiveLoad: { label: "Cognitive Load", icon: Brain, color: "#ec4899" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}

export function ScoreDisplay() {
  const { currentSession } = useAnalysis();
  const result = currentSession?.result;
  if (!result) return null;

  const radarData = Object.entries(result.categories).map(([key, value]) => ({
    category: categoryMeta[key]?.label || key,
    score: value,
  }));

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-border bg-white dark:bg-muted/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-accent flex items-center justify-center">
              <span className="text-3xl font-bold">{result.overallScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">Overall UX Score</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h4 className="text-sm font-semibold mb-4">Category Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(result.categories).map(([key, value]) => {
              const meta = categoryMeta[key];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="w-3.5 h-3.5"
                        style={{ color: meta.color }}
                      />
                      <span className="text-xs font-medium">{meta.label}</span>
                    </div>
                    <span
                      className={`text-sm font-bold ${getScoreColor(value)}`}
                    >
                      {value}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${value}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h4 className="text-sm font-semibold mb-2">Radar Chart</h4>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
              />
              <Radar
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {result.strengths.length > 0 && (
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h4 className="text-sm font-semibold mb-3">Strengths</h4>
          <div className="space-y-2">
            {result.strengths.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-green-500 mt-0.5">+</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
