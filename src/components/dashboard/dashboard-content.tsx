"use client";

import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import { useRouter } from "next/navigation";
import { BarChart3, AlertTriangle, TrendingUp, PlusCircle, ArrowRight } from "lucide-react";

export function DashboardContent() {
  const { user } = useAuth();
  const { currentSession, totalAnalyses } = useAnalysis();
  const router = useRouter();

  const hasResult = currentSession?.result;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          Welcome back, {user?.name || "User"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Your UX analysis workspace
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-sm text-muted-foreground">Total Analyses</span>
          </div>
          <span className="text-3xl font-bold">{totalAnalyses}</span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">Last Score</span>
          </div>
          <span className="text-3xl font-bold">
            {hasResult ? `${hasResult.overallScore}` : "—"}
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm text-muted-foreground">Issues Found</span>
          </div>
          <span className="text-3xl font-bold">
            {hasResult ? hasResult.issues.length : "—"}
          </span>
        </div>
      </div>

      {hasResult ? (
        <div className="p-6 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h2 className="text-lg font-semibold mb-2">Latest Analysis</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {currentSession?.url || `${currentSession?.screenshotCount || 0} screenshot(s) uploaded`}
          </p>
          <button
            onClick={() => router.push("/dashboard/results")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            View Results
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-12 rounded-2xl border border-dashed border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <PlusCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Your UX workspace is ready</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Start your first AI-powered UX analysis. Upload screenshots, share a URL,
            or provide a video to get detailed UX insights.
          </p>
          <button
            onClick={() => router.push("/dashboard/analyze")}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Start New Analysis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
