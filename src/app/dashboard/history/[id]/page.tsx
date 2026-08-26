"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { UXAnalysisResult, ReplayTimelineItem, Severity } from "@/types";
import { SavedReportView } from "@/components/results/saved-report-view";
import {
  ArrowLeft,
  FileText,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Globe,
  ImagePlus,
  Video,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface SavedAnalysis {
  id: string;
  inputType: string;
  url: string | null;
  projectName: string | null;
  targetAudience: string | null;
  productDescription: string | null;
  uxGoals: string | null;
  overallScore: number;
  summary: string;
  createdAt: string;
  categories: {
    accessibility: number;
    usability: number;
    visualHierarchy: number;
    interactionCost: number;
    cognitiveLoad: number;
  } | null;
  strengths: { text: string }[];
  issues: {
    id: string;
    title: string;
    category: string;
    severity: string;
    description: string;
    evidence: string;
    recommendation: string;
  }[];
  recommendations: {
    title: string;
    impact: string;
    description: string;
  }[];
  replayTimeline: {
    timestamp: string;
    event: string;
    status: string;
    observation: string;
    severity: string | null;
  }[];
}

function getInputTypeLabel(type: string) {
  switch (type) {
    case "url":
      return "URL";
    case "screenshots":
      return "Screenshot";
    case "video":
      return "Video";
    default:
      return type;
  }
}

async function handlePDFExport(analysis: SavedAnalysis) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > 270) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("OptiUX-AI", 14, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("UX Analysis Report", pageWidth - 14, y, { align: "right" });
    y += 8;
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    if (analysis.projectName) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Project: ${analysis.projectName}`, 14, y);
      y += 7;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Date: ${new Date(analysis.createdAt).toLocaleDateString()}`,
      14,
      y
    );
    if (analysis.url) {
      doc.text(`URL: ${analysis.url}`, 14, y + 5);
      y += 5;
    }
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Overall UX Score: ${analysis.overallScore}/100`,
      14,
      y
    );
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(
      analysis.summary,
      pageWidth - 28
    );
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 8;

    if (analysis.categories) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Category Scores", 14, y);
      y += 8;

      const catLabels: Record<string, string> = {
        accessibility: "Accessibility",
        usability: "Usability",
        visualHierarchy: "Visual Hierarchy",
        interactionCost: "Interaction Cost",
        cognitiveLoad: "Cognitive Load",
      };

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const [key, value] of Object.entries(analysis.categories)) {
        doc.text(`${catLabels[key] || key}: ${value}/100`, 20, y);
        y += 6;
      }
      y += 6;
    }

    if (analysis.strengths.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Strengths", 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      for (const s of analysis.strengths) {
        addPageIfNeeded(8);
        doc.text(`+ ${s.text}`, 20, y);
        y += 5;
      }
      y += 6;
    }

    if (analysis.issues.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`UX Issues (${analysis.issues.length})`, 14, y);
      y += 8;

      for (const issue of analysis.issues) {
        addPageIfNeeded(25);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(
          `[${issue.severity.toUpperCase()}] ${issue.title} — ${issue.category}`,
          20,
          y
        );
        y += 5;
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(
          issue.description,
          pageWidth - 40
        );
        doc.text(descLines, 24, y);
        y += descLines.length * 4 + 2;
        const recLines = doc.splitTextToSize(
          `Recommendation: ${issue.recommendation}`,
          pageWidth - 40
        );
        doc.text(recLines, 24, y);
        y += recLines.length * 4 + 4;
      }
    }

    if (analysis.recommendations.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Recommendations", 14, y);
      y += 8;
      doc.setFontSize(9);
      for (const rec of analysis.recommendations) {
        addPageIfNeeded(15);
        doc.setFont("helvetica", "bold");
        doc.text(`[${rec.impact}] ${rec.title}`, 20, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(
          rec.description,
          pageWidth - 40
        );
        doc.text(lines, 24, y);
        y += lines.length * 4 + 4;
      }
    }

    const lastPageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Generated by OptiUX-AI",
      pageWidth / 2,
      lastPageHeight - 10,
      { align: "center" }
    );

    doc.save(`optiux-report-${analysis.id}.pdf`);
    toast.success("PDF exported successfully");
  } catch {
    toast.error("Failed to export PDF");
  }
}

export default function SavedReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnalysis = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analyses/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Analysis not found");
          throw new Error("Failed to load analysis");
        }
        return res.json();
      })
      .then((data) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load analysis"
        );
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/analyses/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Analysis not found");
          throw new Error("Failed to load analysis");
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setAnalysis(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : "Failed to load analysis"
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this analysis? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Analysis deleted");
      router.push("/dashboard/history");
    } catch {
      toast.error("Failed to delete analysis");
      setDeleting(false);
    }
  };

  const toResult = (a: SavedAnalysis): UXAnalysisResult => ({
    overallScore: a.overallScore,
    summary: a.summary,
    categories: {
      accessibility: a.categories?.accessibility ?? 0,
      usability: a.categories?.usability ?? 0,
      visualHierarchy: a.categories?.visualHierarchy ?? 0,
      interactionCost: a.categories?.interactionCost ?? 0,
      cognitiveLoad: a.categories?.cognitiveLoad ?? 0,
    },
    strengths: a.strengths.map((s) => s.text),
    issues: a.issues.map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      severity: i.severity as Severity,
      description: i.description,
      evidence: i.evidence,
      recommendation: i.recommendation,
    })),
    recommendations: a.recommendations.map((r) => ({
      title: r.title,
      impact: r.impact as "High" | "Medium" | "Low",
      description: r.description,
    })),
    replayTimeline: a.replayTimeline.map((e) => ({
      timestamp: e.timestamp,
      event: e.event,
      status: e.status as ReplayTimelineItem["status"],
      observation: e.observation,
      severity: e.severity as ReplayTimelineItem["severity"],
    })),
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-60 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">
          {error || "Analysis not found"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The analysis you&apos;re looking for could not be loaded.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={fetchAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
          <Link
            href="/dashboard/history"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const display = analysis.projectName || analysis.url || "Analysis";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h1 className="text-2xl font-bold">{display}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {analysis.inputType === "screenshots" ? (
                <ImagePlus className="w-3.5 h-3.5" />
              ) : analysis.inputType === "video" ? (
                <Video className="w-3.5 h-3.5" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              {getInputTypeLabel(analysis.inputType)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(analysis.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {(analysis.targetAudience || analysis.productDescription || analysis.uxGoals) && (
            <div className="mt-3 p-4 rounded-xl border border-border bg-white dark:bg-muted/30 space-y-1">
              {analysis.targetAudience && (
                <p className="text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Audience:{" "}
                  </span>
                  {analysis.targetAudience}
                </p>
              )}
              {analysis.productDescription && (
                <p className="text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Product:{" "}
                  </span>
                  {analysis.productDescription}
                </p>
              )}
              {analysis.uxGoals && (
                <p className="text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Goals:{" "}
                  </span>
                  {analysis.uxGoals}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handlePDFExport(analysis)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Report content — same design as live results */}
      <SavedReportView result={toResult(analysis)} />

      {/* Bottom actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/analyze"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          New Analysis
        </Link>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back to History
        </Link>
      </div>
    </div>
  );
}
