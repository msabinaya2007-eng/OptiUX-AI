"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { BarChart3, AlertTriangle, TrendingUp, PlusCircle, ArrowRight } from "lucide-react";

interface AnalysisSummary {
  id: string;
  inputType: string;
  url: string | null;
  projectName: string | null;
  overallScore: number;
  summary: string;
  createdAt: string;
  _count: { issues: number; strengths: number; recommendations: number };
}

export function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setAnalyses(data))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  const totalAnalyses = analyses.length;
  const latest = analyses.length > 0 ? analyses[0] : null;

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
          <span className="text-3xl font-bold">{loading ? "—" : totalAnalyses}</span>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">Last Score</span>
          </div>
          <span className="text-3xl font-bold">
            {loading ? "—" : latest ? `${latest.overallScore}` : "—"}
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
            {loading ? "—" : latest ? latest._count.issues : "—"}
          </span>
        </div>
      </div>

      {!loading && latest ? (
        <div className="p-6 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h2 className="text-lg font-semibold mb-2">Latest Analysis</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {latest.url || latest.projectName || `Analysis #${latest.id.slice(0, 8)}`}
          </p>
          <button
            onClick={() => router.push(`/dashboard/history/${latest.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            View Results
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        !loading && (
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
        )
      )}
    </div>
  );
}
