"use client";

import { useState } from "react";
import { useAnalysis } from "@/lib/analysis-context";
import { toast } from "sonner";
import {
  Code2,
  Loader2,
  Check,
  Eye,
  Sparkles,
} from "lucide-react";

const TECHNOLOGIES = [
  "HTML + CSS + JavaScript",
  "React",
  "Next.js",
  "React + Tailwind CSS",
  "Next.js + Tailwind CSS",
] as const;

interface DesignPrototype {
  name: string;
  tagline: string;
  description: string;
  html: string;
  css: string;
}

interface GeneratedDesigns {
  designA: DesignPrototype;
  designB: DesignPrototype;
}

interface CodeBlock {
  issueTitle: string;
  recommendation: string;
  code: string;
}

function buildPreviewDocument(
  design: DesignPrototype
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>
<title>${escapeHtml(design.name)}</title>

<style>
${design.css}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}

body {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>
</head>

<body>
${design.html}
</body>
</html>`;
}

function escapeHtml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function GenerateCodePage() {
  const { currentSession } = useAnalysis();

  const [selectedTech, setSelectedTech] =
    useState<string>(TECHNOLOGIES[0]);

  const [isGeneratingDesigns, setIsGeneratingDesigns] =
    useState(false);

  const [isGeneratingCode, setIsGeneratingCode] =
    useState(false);

  const [designs, setDesigns] =
    useState<GeneratedDesigns | null>(null);

  const [selectedDesign, setSelectedDesign] =
    useState<"A" | "B" | null>(null);

  const [codeBlocks, setCodeBlocks] =
    useState<CodeBlock[]>([]);

  const result = currentSession?.result;

  /* =====================================================
     GENERATE DESIGN A + DESIGN B
  ===================================================== */

  const handleGenerateDesigns = async () => {
    if (!result) {
      toast.error(
        "Run a UX analysis first."
      );
      return;
    }

    if (
      !result.issues ||
      result.issues.length === 0
    ) {
      toast.error(
        "No UX issues were found to redesign."
      );
      return;
    }

    setIsGeneratingDesigns(true);
    setDesigns(null);
    setSelectedDesign(null);
    setCodeBlocks([]);

    try {
      const response = await fetch(
        "/api/generate-designs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            issues: result.issues,
            recommendations:
              result.recommendations,
            context:
              currentSession?.context,
          }),
        }
      );

      const data: unknown =
        await response.json();

      if (!response.ok) {
        const errorMessage =
          isErrorResponse(data)
            ? data.error
            : "Failed to generate designs.";

        throw new Error(
          errorMessage
        );
      }

      if (
        !isDesignResponse(data)
      ) {
        throw new Error(
          "AI returned an invalid design response."
        );
      }

      setDesigns(data);

      toast.success(
        "Design A and Design B generated!"
      );
    } catch (error: unknown) {
      console.error(
        "Design generation error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Design generation failed.";

      toast.error(message);
    } finally {
      setIsGeneratingDesigns(false);
    }
  };

  /* =====================================================
     SELECT DESIGN
  ===================================================== */

  const handleSelectDesign = (
    design: "A" | "B"
  ) => {
    setSelectedDesign(design);

    toast.success(
      `Design ${design} selected`
    );
  };

  /* =====================================================
     GENERATE FINAL CODE
  ===================================================== */

  const handleGenerateCode = async () => {
    if (!result) {
      toast.error(
        "No analysis available."
      );
      return;
    }

    if (!designs) {
      toast.error(
        "Generate Design A and Design B first."
      );
      return;
    }

    if (!selectedDesign) {
      toast.error(
        "Select Design A or Design B first."
      );
      return;
    }

    const chosenDesign =
      selectedDesign === "A"
        ? designs.designA
        : designs.designB;

    setIsGeneratingCode(true);
    setCodeBlocks([]);

    try {
      const response = await fetch(
        "/api/generate-code",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            issues: result.issues,

            recommendations:
              result.recommendations,

            technology:
              selectedTech,

            context:
              currentSession?.context,

            selectedDesign: {
              name:
                chosenDesign.name,

              description:
                chosenDesign.description,

              html:
                chosenDesign.html,

              css:
                chosenDesign.css,
            },
          }),
        }
      );

      const data: unknown =
        await response.json();

      if (!response.ok) {
        const errorMessage =
          isErrorResponse(data)
            ? data.error
            : "Failed to generate code.";

        throw new Error(
          errorMessage
        );
      }

      if (
        !isCodeResponse(data)
      ) {
        throw new Error(
          "AI returned an invalid code response."
        );
      }

      setCodeBlocks(
        data.blocks
      );

      toast.success(
        `Production code generated from Design ${selectedDesign}!`
      );
    } catch (error: unknown) {
      console.error(
        "Code generation error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Code generation failed.";

      toast.error(message);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  /* =====================================================
     NO ANALYSIS
  ===================================================== */

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />

        <h2 className="text-xl font-bold mb-2">
          No Analysis Available
        </h2>

        <p className="text-sm text-muted-foreground">
          Run a UX analysis first to generate
          improved designs and frontend code.
        </p>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">

      {/* =================================================
          HEADER
      ================================================= */}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />

          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            AI Redesign Studio
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          Generate Improved Designs
        </h1>

        <p className="text-sm text-muted-foreground max-w-2xl">
          Turn your UX findings into two visual redesign
          concepts. Choose the direction you prefer and
          generate production-ready frontend code.
        </p>
      </div>

      {/* =================================================
          TECHNOLOGY
      ================================================= */}

      <div className="p-5 rounded-2xl border border-border bg-white dark:bg-muted/30 space-y-4">

        <div>
          <label className="block text-sm font-medium mb-2">
            Target Technology
          </label>

          <div className="flex flex-wrap gap-2">
            {TECHNOLOGIES.map(
              (technology) => (
                <button
                  key={technology}
                  type="button"
                  onClick={() =>
                    setSelectedTech(
                      technology
                    )
                  }
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedTech ===
                    technology
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {technology}
                </button>
              )
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {result.issues.length} UX issue
          {result.issues.length === 1
            ? ""
            : "s"}{" "}
          will be used to create the redesigns.
        </p>

        <button
          type="button"
          onClick={
            handleGenerateDesigns
          }
          disabled={
            isGeneratingDesigns
          }
          className="w-full py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGeneratingDesigns ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Design A & B...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Design A & B
            </>
          )}
        </button>
      </div>

      {/* =================================================
          DESIGN PREVIEWS
      ================================================= */}

      {designs && (
        <section className="space-y-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-xl font-semibold">
                Choose Your Design
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Both concepts are generated from your UX
                findings. Select the direction you prefer.
              </p>
            </div>

            {selectedDesign && (
              <div className="hidden sm:flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-primary/10 text-primary">
                <Check className="w-3.5 h-3.5" />
                Design {selectedDesign} selected
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* =========================================
                DESIGN A
            ========================================= */}

            <DesignCard
              design={designs.designA}
              designId="A"
              selected={
                selectedDesign === "A"
              }
              onSelect={() =>
                handleSelectDesign(
                  "A"
                )
              }
            />

            {/* =========================================
                DESIGN B
            ========================================= */}

            <DesignCard
              design={designs.designB}
              designId="B"
              selected={
                selectedDesign === "B"
              }
              onSelect={() =>
                handleSelectDesign(
                  "B"
                )
              }
            />

          </div>
        </section>
      )}

      {/* =================================================
          GENERATE CODE
      ================================================= */}

      {designs && (
        <section className="p-6 rounded-2xl border border-border bg-white dark:bg-muted/30">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>
              <h2 className="font-semibold">
                Ready for Production?
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                {selectedDesign
                  ? `Generate ${selectedTech} code from Design ${selectedDesign}.`
                  : "Select a design first."}
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleGenerateCode
              }
              disabled={
                isGeneratingCode ||
                !selectedDesign
              }
              className="px-5 py-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingCode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4" />
                  Generate Frontend Code
                </>
              )}
            </button>

          </div>
        </section>
      )}

      {/* =================================================
          GENERATED CODE
      ================================================= */}

      {codeBlocks.length > 0 && (
        <section className="space-y-5">

          <div>
            <h2 className="text-xl font-semibold">
              Generated Frontend Code
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              Production-ready code generated from
              Design {selectedDesign}.
            </p>
          </div>

          <div className="space-y-6">

            {codeBlocks.map(
              (block, index) => (
                <CodeResultCard
                  key={`${block.issueTitle}-${index}`}
                  block={block}
                  selectedTech={
                    selectedTech
                  }
                />
              )
            )}

          </div>
        </section>
      )}

    </div>
  );
}

/* =======================================================
   DESIGN CARD
======================================================= */

interface DesignCardProps {
  design: DesignPrototype;
  designId: "A" | "B";
  selected: boolean;
  onSelect: () => void;
}

function DesignCard({
  design,
  designId,
  selected,
  onSelect,
}: DesignCardProps) {
  const previewDocument =
    buildPreviewDocument(
      design
    );

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border"
      }`}
    >

      {/* HEADER */}

      <div className="p-5 bg-white dark:bg-muted/30">

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-start gap-3">

            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                designId === "A"
                  ? "bg-primary/10 text-primary"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              }`}
            >
              {designId}
            </div>

            <div>
              <h3 className="font-semibold">
                {design.name}
              </h3>

              <p className="text-xs text-primary mt-0.5">
                {design.tagline}
              </p>
            </div>

          </div>

          {selected && (
            <div className="flex items-center gap-1 text-xs font-medium text-primary">
              <Check className="w-4 h-4" />
              Selected
            </div>
          )}

        </div>

        <p className="text-sm text-muted-foreground mt-3">
          {design.description}
        </p>

      </div>

      {/* PREVIEW */}

      <div className="bg-muted/40 p-3">

        <div className="rounded-xl overflow-hidden border border-border bg-white">

          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">

            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-2">
              <Eye className="w-3 h-3" />
              Live Preview
            </div>

          </div>

          <iframe
            title={`Design ${designId} preview`}
            srcDoc={previewDocument}
            sandbox=""
            className="w-full h-[560px] bg-white"
          />

        </div>

      </div>

      {/* SELECT */}

      <div className="p-4 bg-white dark:bg-muted/30">

        <button
          type="button"
          onClick={onSelect}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:bg-muted"
          }`}
        >
          {selected ? (
            <>
              <Check className="w-4 h-4" />
              Design {designId} Selected
            </>
          ) : (
            `Select Design ${designId}`
          )}
        </button>

      </div>

    </div>
  );
}

/* =======================================================
   CODE RESULT CARD
======================================================= */

interface CodeResultCardProps {
  block: CodeBlock;
  selectedTech: string;
}

function CodeResultCard({
  block,
  selectedTech,
}: CodeResultCardProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        block.code
      );

      toast.success(
        "Code copied to clipboard"
      );
    } catch {
      toast.error(
        "Unable to copy code"
      );
    }
  };

  const handleDownload = () => {
    const extension =
      selectedTech.includes("HTML")
        ? "html"
        : selectedTech.includes(
            "React"
          ) ||
          selectedTech.includes(
            "Next.js"
          )
        ? "tsx"
        : "js";

    const filename =
      `optiux-${slugify(
        block.issueTitle
      )}.${extension}`;

    const blob =
      new Blob(
        [block.code],
        {
          type: "text/plain",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;
    anchor.download =
      filename;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-muted/30 overflow-hidden">

      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-muted/30">

        <div>
          <h3 className="text-sm font-semibold">
            {block.issueTitle}
          </h3>

          <p className="text-xs text-muted-foreground mt-1">
            {block.recommendation}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">

          <button
            type="button"
            onClick={
              handleCopy
            }
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Copy
          </button>

          <button
            type="button"
            onClick={
              handleDownload
            }
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Download
          </button>

        </div>

      </div>

      <pre className="p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed max-h-[600px]">
        <code>
          {block.code}
        </code>
      </pre>

    </div>
  );
}

/* =======================================================
   HELPERS
======================================================= */

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isErrorResponse(
  value: unknown
): value is {
  error: string;
} {
  return (
    isRecord(value) &&
    typeof value.error ===
      "string"
  );
}

function isDesignPrototype(
  value: unknown
): value is DesignPrototype {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name ===
      "string" &&
    typeof value.tagline ===
      "string" &&
    typeof value.description ===
      "string" &&
    typeof value.html ===
      "string" &&
    typeof value.css ===
      "string"
  );
}

function isDesignResponse(
  value: unknown
): value is GeneratedDesigns {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isDesignPrototype(
      value.designA
    ) &&
    isDesignPrototype(
      value.designB
    )
  );
}

function isCodeResponse(
  value: unknown
): value is {
  blocks: CodeBlock[];
} {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !Array.isArray(
      value.blocks
    )
  ) {
    return false;
  }

  return value.blocks.every(
    (block) =>
      isRecord(block) &&
      typeof block.issueTitle ===
        "string" &&
      typeof block.recommendation ===
        "string" &&
      typeof block.code ===
        "string"
  );
}

function slugify(
  value: string
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 80);
}