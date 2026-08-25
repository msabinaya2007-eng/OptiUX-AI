"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Globe,
  ImagePlus,
  Video,
  ArrowRight,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ChevronDown,
  ArrowUpDown,
  Clock,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface AnalysisSummary {
  id: string;
  inputType: string;
  url: string | null;
  projectName: string | null;
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
  _count: {
    issues: number;
    strengths: number;
    recommendations: number;
  };
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

function getScoreStyles(score: number) {
  if (score >= 80)
    return {
      ring: "border-green-500",
      text: "text-green-500",
      bg: "bg-green-500/10",
    };
  if (score >= 60)
    return {
      ring: "border-yellow-500",
      text: "text-yellow-500",
      bg: "bg-yellow-500/10",
    };
  return {
    ring: "border-red-500",
    text: "text-red-500",
    bg: "bg-red-500/10",
  };
}

function getInputTypeIcon(type: string) {
  switch (type) {
    case "url":
      return Globe;
    case "screenshots":
      return ImagePlus;
    case "video":
      return Video;
    default:
      return BarChart3;
  }
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

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyses");
      if (!res.ok) throw new Error("Failed to load analyses");
      const data = await res.json();
      setAnalyses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analyses"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this analysis? This cannot be undone.")) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        setAnalyses((prev) => prev.filter((a) => a.id !== id));
        toast.success("Analysis deleted");
      } catch {
        toast.error("Failed to delete analysis");
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const filtered = useMemo(() => {
    let result = [...analyses];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.projectName && a.projectName.toLowerCase().includes(q)) ||
          (a.url && a.url.toLowerCase().includes(q)) ||
          a.summary.toLowerCase().includes(q)
      );
    }

    if (filterType !== "all") {
      result = result.filter((a) => a.inputType === filterType);
    }

    switch (sort) {
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "highest":
        result.sort((a, b) => b.overallScore - a.overallScore);
        break;
      case "lowest":
        result.sort((a, b) => a.overallScore - b.overallScore);
        break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [analyses, search, filterType, sort]);

  const sortLabels: Record<SortOption, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    highest: "Highest score",
    lowest: "Lowest score",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and manage your saved UX analyses
          </p>
        </div>
        <Link
          href="/dashboard/analyze"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by project, URL, or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted/30 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="all">All Types</option>
            <option value="url">URL</option>
            <option value="screenshots">Screenshots</option>
            <option value="video">Video</option>
          </select>

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="inline-flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border border-border bg-white dark:bg-muted/30 hover:bg-muted transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sortLabels[sort]}</span>
            </button>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-white dark:bg-muted shadow-lg overflow-hidden">
                  {(Object.entries(sortLabels) as [SortOption, string][]).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSort(key);
                          setShowSortMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sort === key
                            ? "bg-accent/10 text-accent font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-12 rounded-2xl border border-border bg-white dark:bg-muted/30 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to load analyses</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {error}
          </p>
          <button
            onClick={fetchAnalyses}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && analyses.length === 0 && (
        <div className="p-12 rounded-2xl border border-dashed border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Run your first UX analysis to see your reports here.
          </p>
          <Link
            href="/dashboard/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Your First Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* No results after filtering */}
      {!loading && !error && analyses.length > 0 && filtered.length === 0 && (
        <div className="p-12 rounded-2xl border border-dashed border-border text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matches found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Analysis cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((analysis) => {
            const styles = getScoreStyles(analysis.overallScore);
            const TypeIcon = getInputTypeIcon(analysis.inputType);
            const display =
              analysis.projectName ||
              (analysis.url
                ? (() => {
                    try {
                      return new URL(analysis.url).hostname;
                    } catch {
                      return analysis.url;
                    }
                  })()
                : `${getInputTypeLabel(analysis.inputType)} analysis`);

            return (
              <div
                key={analysis.id}
                className="group p-5 rounded-2xl border border-border bg-white dark:bg-muted/30 hover:border-accent/30 transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/history/${analysis.id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Score circle */}
                  <div
                    className={`w-14 h-14 rounded-full border-2 ${styles.ring} flex items-center justify-center shrink-0`}
                  >
                    <span className={`text-lg font-bold ${styles.text}`}>
                      {analysis.overallScore}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">
                        {display}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground shrink-0">
                        <TypeIcon className="w-3 h-3" />
                        {getInputTypeLabel(analysis.inputType)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {analysis.summary}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(analysis.createdAt)}
                      </span>
                      <span>
                        {analysis._count.issues} issue
                        {analysis._count.issues !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {analysis._count.strengths} strength
                        {analysis._count.strengths !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {analysis._count.recommendations} rec
                        {analysis._count.recommendations !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(analysis.id);
                      }}
                      disabled={deletingId === analysis.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete analysis"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
