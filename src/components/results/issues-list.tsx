"use client";

import { useState } from "react";
import { useAnalysis } from "@/lib/analysis-context";
import type { Severity, UXCategory } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Info,
  AlertOctagon,
  Sparkles,
} from "lucide-react";

const severityConfig: Record<
  Severity,
  {
    label: string;
    color: string;
    bg: string;
    icon: typeof AlertTriangle;
  }
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

const categories: (UXCategory | "all")[] = [
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

const severities: (Severity | "all")[] = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];

export function IssuesList() {
  const { currentSession } = useAnalysis();
  const result = currentSession?.result;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] =
    useState<UXCategory | "all">("all");
  const [filterSeverity, setFilterSeverity] =
    useState<Severity | "all">("all");
    const [generatingId, setGeneratingId] = useState<string | null>(null);
const [generatedCode, setGeneratedCode] = useState<{
  issueTitle: string;
  recommendation: string;
  code: string;
} | null>(null);

  if (!result || result.issues.length === 0) return null;
  const handleFixWithAI = async (issue: (typeof result.issues)[number]) => {
  try {
    setGeneratingId(issue.id);
    setGeneratedCode(null);

    const response = await fetch("/api/generate-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issues: [issue],
        recommendations: [
          {
            title: issue.title,
            impact:
              issue.severity === "critical" || issue.severity === "high"
                ? "High"
                : issue.severity === "medium"
                ? "Medium"
                : "Low",
            description: issue.recommendation,
          },
        ],
        technology: "React / Next.js / Tailwind CSS",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate code");
    }

    if (!data.blocks || data.blocks.length === 0) {
      throw new Error("AI did not generate any code");
    }

    setGeneratedCode(data.blocks[0]);
  } catch (error) {
    console.error("AI code generation failed:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Failed to generate improved code"
    );
  } finally {
    setGeneratingId(null);
  }
};
  const filtered = result.issues.filter((issue) => {
    if (
      filterCategory !== "all" &&
      issue.category !== categoryLabels[filterCategory]
    ) {
      return false;
    }

    if (
      filterSeverity !== "all" &&
      issue.severity !== filterSeverity
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          UX Issues ({result.issues.length})
        </h2>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(
                e.target.value as UXCategory | "all"
              )
            }
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white dark:bg-muted"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c] || c}
              </option>
            ))}
          </select>

          <select
            value={filterSeverity}
            onChange={(e) =>
              setFilterSeverity(
                e.target.value as Severity | "all"
              )
            }
            className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white dark:bg-muted"
          >
            {severities.map((s) => (
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
          const sev = severityConfig[issue.severity];
          const Icon = sev.icon;
          const isExpanded = expandedId === issue.id;

          return (
            <div
              key={issue.id}
              className="rounded-xl border border-border bg-white dark:bg-muted/30 overflow-hidden"
            >
              {/* Issue header */}
              <button
                onClick={() =>
                  setExpandedId(
                    isExpanded ? null : issue.id
                  )
                }
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon
                    className={`w-4 h-4 ${sev.color}`}
                  />
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

                  <p className="text-sm font-medium truncate">
                    {issue.title}
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded issue */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                      Description
                    </h5>

                    <p className="text-sm">
                      {issue.description}
                    </p>
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

                    <p className="text-sm">
                      {issue.recommendation}
                    </p>
                  </div>

                  {/* AI FIX BUTTON */}
                  <button
  onClick={(e) => {
    e.stopPropagation();
    handleFixWithAI(issue);
  }}
  disabled={generatingId === issue.id}
  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Sparkles className="w-4 h-4" />

  {generatingId === issue.id
    ? "Generating..."
    : "Fix with AI"}
</button>
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