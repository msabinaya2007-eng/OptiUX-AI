"use client";

import { useRouter } from "next/navigation";
import { useAnalysis } from "@/lib/analysis-context";
import { ScoreDisplay } from "@/components/results/score-display";
import { IssuesList } from "@/components/results/issues-list";
import { Recommendations } from "@/components/results/recommendations";
import { PDFExport } from "@/components/results/pdf-export";
import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
  const { currentSession } = useAnalysis();
  const router = useRouter();
  const result = currentSession?.result;

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <PlusCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">No Analysis Results</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Run a UX analysis to see results here.
        </p>
        <Link
          href="/dashboard/analyze"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Start Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h1 className="text-2xl font-bold">UX Analysis Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentSession?.url ||
              `${currentSession?.screenshotCount} screenshot(s)`}
            {" \u00b7 "}
            {new Date(currentSession?.timestamp || "").toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        </div>
        <PDFExport />
      </div>

      <ScoreDisplay />
      <IssuesList />
      <Recommendations />

      <div className="flex gap-3">
        <Link
          href="/dashboard/analyze"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-4 h-4" />
          New Analysis
        </Link>
        <Link
          href="/dashboard/generate-code"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Generate Improved Code
        </Link>
      </div>
    </div>
  );
}
