"use client";

import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { clearAll } = useAnalysis();
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetch("/api/analyses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setTotalAnalyses(data.length))
      .catch(() => setTotalAnalyses(0));
  }, []);

  const handleClearAll = async () => {
    if (
      !confirm(
        "This will permanently delete ALL analysis records from the database and clear local session data. This cannot be undone."
      )
    ) {
      return;
    }

    setClearing(true);

    try {
      const res = await fetch("/api/analyses", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete from database");

      clearAll();
      setTotalAnalyses(0);
      toast.success("All analysis data cleared (database + local storage)");
    } catch (err) {
      console.error("[OptiUX] Clear all failed:", err);
      toast.error("Failed to clear data. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your OptiUX-AI workspace
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Account</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{user?.name || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email || "—"}</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Data Storage</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Analyses</span>
              <span>{totalAnalyses === null ? "—" : totalAnalyses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Storage</span>
              <span>PostgreSQL (server) + localStorage (session only)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Analysis records are stored in the database. Only the most recent
            session result is kept in your browser for quick access.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-danger/20 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-danger mb-1">
                Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete ALL analysis records from the database and
                clear your local session. This action is irreversible.
              </p>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {clearing ? "Clearing..." : "Clear All Data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
