"use client";

import { useState } from "react";
import type {
  UXAnalysisResult,
  Severity,
  UXCategory,
  ReplayTimelineItem,
} from "@/types";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import {
  Accessibility,
  MousePointer,
  Layers,
  DollarSign,
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  AlertCircle,
  Info,
  Zap,
  TrendingUp,
  Clock,
} from "lucide-react";

/* ===========================================================
   TYPES
=========================================================== */

interface SavedReportViewProps {
  result: UXAnalysisResult;
}

/* ===========================================================
   SHARED METADATA
=========================================================== */

const categoryMeta: Record<
  string,
  { label: string; icon: typeof Brain; color: string }
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

const severityConfig: Record<
  Severity,
  { label: string; color: string; bg: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: "Critical",
    color: "text-red-600",
    bg: "bg-red-500/10",
    icon: AlertOctagon,
  },
  high: {
    label: "High",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    icon: AlertCircle,
  },
  low: {
    label: "Low",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Info,
  },
};

const filterCategories: (UXCategory | "all")[] = [
  "all",
  "accessibility",
  "usability",
  "visualHierarchy",
  "interactionCost",
  "cognitiveLoad",
];

const categoryLabels: Record<string, string> = {
  all: "All",
  accessibility: "Accessibility",
  usability: "Usability",
  visualHierarchy: "Visual Hierarchy",
  interactionCost: "Interaction Cost",
  cognitiveLoad: "Cognitive Load",
};

const filterSeverities: (Severity | "all")[] = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];

/* ===========================================================
   SCORE SECTION
=========================================================== */

function ScoreSection({ result }: { result: UXAnalysisResult }) {
  const radarData = Object.entries(result.categories).map(([key, value]) => ({
    category: categoryMeta[key]?.label || key,
    score: value,
  }));

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-border bg-white dark:bg-muted/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-accent flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold">{result.overallScore}</span>
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

/* ===========================================================
   ISSUES SECTION
=========================================================== */

function IssuesSection({ issues }: { issues: UXAnalysisResult["issues"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<UXCategory | "all">("all");
  const [filterSev, setFilterSev] = useState<Severity | "all">("all");

  if (issues.length === 0) return null;

  const filtered = issues.filter((issue) => {
    if (filterCat !== "all" && issue.category !== categoryLabels[filterCat])
      return false;
    if (filterSev !== "all" && issue.severity !== filterSev) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">UX Issues ({issues.length})</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value as UXCategory | "all")}
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white dark:bg-muted"
          >
            {filterCategories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c] || c}
              </option>
            ))}
          </select>
          <select
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value as Severity | "all")}
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white dark:bg-muted"
          >
            {filterSeverities.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? "All Severities"
                  : severityConfig[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((issue) => {
          const sev = severityConfig[issue.severity as Severity] || severityConfig.medium;
          const Icon = sev.icon;
          const isExpanded = expandedId === issue.id;

          return (
            <div
              key={issue.id}
              className="rounded-xl border border-border bg-white dark:bg-muted/30 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : issue.id)
                }
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${sev.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[10px] font-bold uppercase ${sev.color}`}
                    >
                      {sev.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{issue.title}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                      Description
                    </h5>
                    <p className="text-sm">{issue.description}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                      Evidence
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {issue.evidence}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                      Recommendation
                    </h5>
                    <p className="text-sm">{issue.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No issues match the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}

/* ===========================================================
   RECOMMENDATIONS SECTION
=========================================================== */

function RecommendationsSection({
  recommendations,
}: {
  recommendations: UXAnalysisResult["recommendations"];
}) {
  if (recommendations.length === 0) return null;

  const quickWins = recommendations.filter((r) => r.impact === "Medium");
  const highImpact = recommendations.filter((r) => r.impact === "High");
  const longTerm = recommendations.filter((r) => r.impact === "Low");

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
                  <p className="text-xs text-muted-foreground">{section.desc}</p>
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

/* ===========================================================
   REPLAY TIMELINE SECTION
=========================================================== */

function ReplaySection({
  timeline,
}: {
  timeline?: ReplayTimelineItem[];
}) {
  if (!timeline || timeline.length === 0) return null;

  const getIcon = (status: ReplayTimelineItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5" />;
      case "friction":
        return <AlertTriangle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">UX Replay</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated timeline of the user&apos;s journey and interaction
          friction.
        </p>
      </div>
      <div className="space-y-6">
        {timeline.map((item, index) => (
          <div key={`${item.timestamp}-${index}`} className="flex gap-4">
            <div className="mt-1">{getIcon(item.status)}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono">
                  {item.timestamp}
                </span>
                {item.severity && (
                  <span className="text-xs uppercase text-muted-foreground">
                    {item.severity}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-medium">{item.event}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.observation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===========================================================
   MAIN COMPONENT
=========================================================== */

export function SavedReportView({ result }: SavedReportViewProps) {
  return (
    <div className="space-y-8">
      <ScoreSection result={result} />
      <ReplaySection timeline={result.replayTimeline} />
      <IssuesSection issues={result.issues} />
      <RecommendationsSection recommendations={result.recommendations} />
    </div>
  );
}
