"use client";

import { useState } from "react";
import { useAnalysis } from "@/lib/analysis-context";
import { toast } from "sonner";
import { Copy, Download, Loader2, Code2 } from "lucide-react";

const TECHNOLOGIES = [
  "HTML + CSS + JavaScript",
  "React",
  "Next.js",
  "React + Tailwind CSS",
  "Next.js + Tailwind CSS",
];

interface CodeBlock {
  issueTitle: string;
  recommendation: string;
  code: string;
}

export default function GenerateCodePage() {
  const { currentSession } = useAnalysis();
  const [selectedTech, setSelectedTech] = useState(TECHNOLOGIES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const result = currentSession?.result;

  const handleGenerate = async () => {
    if (!result || result.issues.length === 0) {
      toast.error("No analysis issues to generate code for");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issues: result.issues,
          recommendations: result.recommendations,
          technology: selectedTech,
          context: currentSession?.context,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate code");

      setCodeBlocks(data.blocks || []);
      toast.success("Code generated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const handleDownload = (code: string, title: string) => {
    const ext = selectedTech.includes("HTML")
      ? "html"
      : selectedTech.includes("React") || selectedTech.includes("Next.js")
      ? "tsx"
      : "js";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optiux-improved-${title.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">No Analysis Available</h2>
        <p className="text-sm text-muted-foreground">
          Run a UX analysis first to generate improved code.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Generate Improved Code</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated frontend code based on your UX analysis findings
        </p>
      </div>

      <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Target Technology
          </label>
          <div className="flex flex-wrap gap-2">
            {TECHNOLOGIES.map((tech) => (
              <button
                key={tech}
                onClick={() => setSelectedTech(tech)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedTech === tech
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {tech}
              </button>
            ))}
          </div>
        </div>

        {result.issues.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Code will be generated for {result.issues.length} identified UX
            issue(s).
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4" />
              Generate Improved Code
            </>
          )}
        </button>
      </div>

      {codeBlocks.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Generated Code</h3>
          {codeBlocks.map((block, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-white dark:bg-muted/30 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div>
                  <h4 className="text-sm font-medium">{block.issueTitle}</h4>
                  <p className="text-xs text-muted-foreground">
                    {block.recommendation}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(block.code)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    title="Copy code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(block.code, block.issueTitle)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    title="Download code"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="p-5 overflow-x-auto text-sm font-mono leading-relaxed">
                <code>{block.code}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {currentSession?.inputType !== "url" && codeBlocks.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border-t border-border">
          Since the analysis was based on screenshots/video (not source code),
          the generated code is an improved reference implementation inspired
          by the analyzed design and cannot directly modify the original private
          source code.
        </p>
      )}
    </div>
  );
}
