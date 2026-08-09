"use client";

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Circle,
} from "lucide-react";

interface ReplayTimelineItem {
  timestamp: string;
  event: string;
  status: "success" | "friction" | "error" | "neutral";
  observation: string;
  severity?: "critical" | "high" | "medium" | "low";
}

interface UXReplayProps {
  timeline?: ReplayTimelineItem[];
}

export function UXReplay({ timeline }: UXReplayProps) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

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
        <h2 className="text-xl font-semibold">
          UX Replay
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated timeline of the user&apos;s journey
          and interaction friction.
        </p>
      </div>

      <div className="space-y-6">
        {timeline.map((item, index) => (
          <div
            key={`${item.timestamp}-${index}`}
            className="flex gap-4"
          >
            <div className="mt-1">
              {getIcon(item.status)}
            </div>

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

              <h3 className="mt-2 font-medium">
                {item.event}
              </h3>

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