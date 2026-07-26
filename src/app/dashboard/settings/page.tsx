"use client";

import { useAuth } from "@/lib/auth-context";
import { useAnalysis } from "@/lib/analysis-context";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { clearAll, totalAnalyses } = useAnalysis();

  const handleClearAll = () => {
    if (
      confirm(
        "Are you sure you want to clear all local analysis data? This cannot be undone."
      )
    ) {
      clearAll();
      toast.success("All local data cleared");
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
          <h3 className="text-sm font-semibold mb-3">Local Data</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Analyses</span>
              <span>{totalAnalyses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Storage</span>
              <span>Browser localStorage</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            All analysis data is stored locally in your browser. No data is sent
            to any server except for the AI API during analysis.
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
                Clear all locally stored analysis data. This will remove your
                current session and analysis count.
              </p>
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
