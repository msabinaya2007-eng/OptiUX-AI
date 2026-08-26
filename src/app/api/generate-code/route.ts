import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { formatQuotaError, generateGeminiContent } from "@/lib/ai/gemini";

import type {
  UXIssue,
  UXRecommendation,
  AnalysisContext,
} from "@/types";

/* =====================================================
   TYPES
===================================================== */

interface SelectedDesign {
  name: string;
  description: string;
  html: string;
  css: string;
}

interface GenerateCodeRequest {
  issues: UXIssue[];
  recommendations: UXRecommendation[];
  technology: string;
  context?: AnalysisContext;
  selectedDesign?: SelectedDesign;
}

interface GeneratedCodeBlock {
  issueTitle: string;
  recommendation: string;
  code: string;
}

interface GeneratedCodeResponse {
  blocks: GeneratedCodeBlock[];
}

/* =====================================================
   SYSTEM PROMPT
===================================================== */

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert frontend engineer and UX engineer.

Your job is to convert an AI-generated visual UX redesign
prototype into real, usable frontend code.

The user has already selected one visual redesign.

You MUST use that selected design as the primary source of truth.

====================================================
GOAL
====================================================

Convert the selected HTML/CSS prototype into the requested
frontend technology.

Preserve:

- layout
- visual hierarchy
- spacing
- typography
- colors
- cards
- buttons
- navigation
- forms
- sections
- responsive behavior
- accessibility improvements
- UX improvements

Do NOT redesign the selected design again.

The selected design has already been chosen by the user.

====================================================
TECHNOLOGY
====================================================

If technology is:

HTML + CSS + JavaScript
→ Generate standard HTML/CSS/JavaScript.

React
→ Generate React + JSX/TSX compatible code.

Next.js
→ Generate Next.js compatible React code.

React + Tailwind CSS
→ Convert the design to React using Tailwind CSS.

Next.js + Tailwind CSS
→ Convert the design to Next.js using Tailwind CSS.

====================================================
IMPORTANT
====================================================

The selected prototype may contain:

HTML
CSS

Treat these as the visual source.

Translate them accurately into the requested technology.

Do NOT simply copy the HTML/CSS if another technology
was requested.

====================================================
UX REQUIREMENTS
====================================================

The generated implementation must:

- be responsive
- use semantic HTML
- have accessible buttons
- have accessible form controls
- have meaningful labels
- support keyboard navigation
- have visible focus states where relevant
- preserve readable contrast
- preserve clear visual hierarchy
- minimize unnecessary interactions
- preserve the selected design's UX improvements

====================================================
CODE QUALITY
====================================================

Generate real functional code.

Do NOT generate pseudocode.

Do NOT use placeholders such as:

TODO
IMPLEMENT HERE
YOUR CODE HERE

Use realistic content.

Include imports when required.

For React/Next.js:

- Use functional components.
- Use TypeScript where appropriate.
- Do not use unnecessary dependencies.
- Do not invent dependencies.

For Next.js:

Use client components only when interaction/state
actually requires them.

====================================================
OUTPUT
====================================================

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT use code fences.

Return EXACTLY:

{
  "blocks": [
    {
      "issueTitle": "Selected Design Implementation",
      "recommendation": "Implementation of the selected UX redesign",
      "code": "Complete frontend implementation"
    }
  ]
}

The code field must contain the actual implementation.

Do not put explanations outside the JSON.
`;

/* =====================================================
   GEMINI GENERATION
===================================================== */

/*
 * generateGeminiContent() (src/lib/ai/gemini.ts) is used
 * instead of a raw SDK call so code generation gets the
 * same retry/backoff behavior as UX analysis for
 * temporary API failures.
 *
 * Permanent failures (e.g. free-tier daily quota,
 * billing problems) fail fast and are translated into
 * clear user-facing messages via formatQuotaError().
 */

function errorToMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

/* =====================================================
   JSON EXTRACTION
===================================================== */

/*
 * Gemini sometimes wraps JSON in Markdown fences even
 * when told not to — including asymmetric cases such as
 * a leading "```json" but a bare trailing "```", or
 * stray fences after the closing brace. Strip every
 * fence variant from both ends before parsing.
 */

function stripMarkdownFences(
  text: string
): string {
  let cleaned = text.trim();

  for (;;) {
    const before = cleaned;

    cleaned = cleaned
      .replace(
        /^```[a-zA-Z0-9_-]*\s*/,
        ""
      )
      .replace(
        /```\s*$/,
        ""
      )
      .trim();

    if (cleaned === before) {
      break;
    }
  }

  return cleaned;
}

/*
 * Find the first "{" and its MATCHING closing brace,
 * respecting JSON strings and escape sequences. Naive
 * first-{ / last-} slicing breaks when the model appends
 * extra text containing braces after the JSON body.
 */

function extractBalancedJsonObject(
  text: string
): string | null {
  const start = text.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = start;
    i < text.length;
    i++
  ) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return text.slice(
          start,
          i + 1
        );
      }
    }
  }

  return null;
}

function extractJSON(
  text: string
): unknown {
  const cleaned =
    stripMarkdownFences(text);

  // Attempt 1: the whole payload is JSON.

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue.
  }

  // Attempt 2: balanced-brace extraction.

  const balanced =
    extractBalancedJsonObject(
      cleaned
    );

  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // Continue.
    }
  }

  // Attempt 3: naive outermost-brace slice.

  const first =
    cleaned.indexOf("{");

  const last =
    cleaned.lastIndexOf("}");

  if (
    first !== -1 &&
    last > first
  ) {
    try {
      return JSON.parse(
        cleaned.slice(
          first,
          last + 1
        )
      );
    } catch {
      // Fall through to failure.
    }
  }

  throw new Error(
    "Gemini did not return valid JSON."
  );
}

/*
 * Safe bounded logging — never dump entire
 * multi-KB code payloads into server logs.
 */

function safeSnippet(
  text: string
): string {
  const singleLine = text
    .replace(/\s+/g, " ")
    .trim();

  return singleLine.length > 300
    ? `${singleLine.substring(0, 300)}... [truncated, ${text.length} chars total]`
    : singleLine;
}

/* =====================================================
   TYPE HELPERS
===================================================== */

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null
  );
}

function isGeneratedCodeResponse(
  value: unknown
): value is GeneratedCodeResponse {
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
    (block) => {
      if (
        !isRecord(block)
      ) {
        return false;
      }

      return (
        typeof block.issueTitle ===
          "string" &&
        typeof block.recommendation ===
          "string" &&
        typeof block.code ===
          "string"
      );
    }
  );
}

/* =====================================================
   POST
===================================================== */

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    /* =================================================
       1. CHECK API KEY
    ================================================= */

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "AI code generation is not configured. Add GEMINI_API_KEY to .env.local.",
        },
        {
          status: 503,
        }
      );
    }

    /* =================================================
       2. READ BODY
    ================================================= */

    const body =
      (await request.json()) as GenerateCodeRequest;

    /* =================================================
       3. VALIDATE ISSUES
    ================================================= */

    if (
      !Array.isArray(
        body.issues
      ) ||
      body.issues.length === 0
    ) {
      return Response.json(
        {
          error:
            "No UX issues were provided.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       4. VALIDATE TECHNOLOGY
    ================================================= */

    if (
      !body.technology ||
      body.technology.trim()
        .length === 0
    ) {
      return Response.json(
        {
          error:
            "Technology selection is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       5. VALIDATE SELECTED DESIGN
    ================================================= */

    if (!body.selectedDesign) {
      return Response.json(
        {
          error:
            "Please select Design A or Design B before generating frontend code.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedDesign =
      body.selectedDesign;

    if (
      !selectedDesign.html ||
      !selectedDesign.css
    ) {
      return Response.json(
        {
          error:
            "The selected design does not contain valid HTML/CSS.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       6. UX ISSUES
    ================================================= */

    const issuesSummary =
      body.issues
        .map(
          (
            issue,
            index
          ) =>
            `${index + 1}. [${
              issue.severity
            }] ${
              issue.title
            }

Category:
${issue.category}

Description:
${issue.description}

Evidence:
${issue.evidence}

Recommendation:
${issue.recommendation}`
        )
        .join(
          "\n\n"
        );

    /* =================================================
       7. RECOMMENDATIONS
    ================================================= */

    const recommendationsSummary =
      body.recommendations
        ?.map(
          (
            recommendation,
            index
          ) =>
            `${index + 1}. [${
              recommendation.impact
            }] ${
              recommendation.title
            }

Description:
${recommendation.description}`
        )
        .join(
          "\n\n"
        ) ||
      "No additional recommendations.";

    /* =================================================
       8. CONTEXT
    ================================================= */

    let contextSummary =
      "";

    if (body.context) {
      if (
        body.context.projectName
      ) {
        contextSummary +=
          `Project: ${body.context.projectName}\n`;
      }

      if (
        body.context.targetAudience
      ) {
        contextSummary +=
          `Target Audience: ${body.context.targetAudience}\n`;
      }

      if (
        body.context.productDescription
      ) {
        contextSummary +=
          `Product Description: ${body.context.productDescription}\n`;
      }

      if (
        body.context.uxGoals
      ) {
        contextSummary +=
          `UX Goals: ${body.context.uxGoals}\n`;
      }
    }

    /* =================================================
       9. BUILD PROMPT
    ================================================= */

    const userPrompt = `
Convert the following selected visual design into
production-ready frontend code.

====================================================
TARGET TECHNOLOGY
====================================================

${body.technology}

====================================================
SELECTED DESIGN
====================================================

Design name:
${selectedDesign.name}

Design description:
${selectedDesign.description}

====================================================
SELECTED DESIGN HTML
====================================================

${selectedDesign.html}

====================================================
SELECTED DESIGN CSS
====================================================

${selectedDesign.css}

====================================================
UX ISSUES
====================================================

${issuesSummary}

====================================================
UX RECOMMENDATIONS
====================================================

${recommendationsSummary}

====================================================
PROJECT CONTEXT
====================================================

${
  contextSummary ||
  "No additional project context provided."
}

====================================================
IMPLEMENTATION TASK
====================================================

Convert the selected design into:

${body.technology}

The selected design is the source of truth.

Preserve its visual appearance and UX decisions.

Do not create a different design.

Make the result functional and production-quality.

If multiple UX issues exist, prioritize the most important
ones while preserving the selected design.

Return ONLY the required JSON response.
`;

    /* =================================================
       10. CALL GEMINI
    ================================================= */

    const fullPrompt = `${SYSTEM_PROMPT}

${userPrompt}`;

    const aiContent =
      await generateGeminiContent(
        fullPrompt
      );

    /* =================================================
       11. PARSE RESPONSE (WITH ONE AUTO-RETRY)

       Gemini occasionally returns malformed or
       fenced JSON. One automatic regeneration
       usually fixes it without user action.
    ================================================= */

    let parsed: unknown;

    let parseFailed = false;

    try {
      parsed = extractJSON(aiContent);
    } catch {
      parseFailed = true;
    }

    if (!parseFailed && !isGeneratedCodeResponse(parsed)) {
      parseFailed = true;
    }

    if (parseFailed) {
      console.error(
        "[OptiUX] First code-gen response unusable, retrying once. Snippet:",
        safeSnippet(aiContent)
      );

      const retryContent =
        await generateGeminiContent(
          `${fullPrompt}

IMPORTANT: Your previous response could not be parsed.
Return ONLY the raw JSON object. No Markdown fences,
no commentary, no text before or after the JSON.`,
          []
        );

      try {
        parsed = extractJSON(retryContent);

        if (
          !isGeneratedCodeResponse(
            parsed
          )
        ) {
          throw new Error(
            "Invalid response structure."
          );
        }
      } catch (retryError) {
        console.error(
          "[OptiUX] Code-gen retry also failed. Snippet:",
          safeSnippet(retryContent),
          retryError
        );

        return Response.json(
          {
            error:
              "Gemini returned an invalid code generation response after a retry. Please try again in a moment.",
          },
          {
            status: 502,
          }
        );
      }
    }

    /* =================================================
       12. VALIDATE RESPONSE
    ================================================= */

    if (
      !isGeneratedCodeResponse(
        parsed
      )
    ) {
      console.error(
        "[OptiUX] Invalid generated code structure."
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid frontend code structure.",
        },
        {
          status: 502,
        }
      );
    }

    /* =================================================
       13. RETURN
    ================================================= */

    return Response.json(
      {
        blocks:
          parsed.blocks,

        technology:
          body.technology,

        selectedDesign:
          selectedDesign.name,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      "OptiUX-AI code generation error:",
      error
    );

    /*
     * Quota / billing problems: return a clear,
     * actionable message. NEVER forward the raw
     * Gemini ApiError JSON to the client.
     */

    const quotaMessage =
      formatQuotaError(error);

    if (quotaMessage) {
      return Response.json(
        {
          error: quotaMessage,
        },
        {
          status: 429,
        }
      );
    }

    if (
      errorToMessage(error).includes(
        "GEMINI_API_KEY"
      )
    ) {
      return Response.json(
        {
          error:
            "AI code generation is not configured. Add GEMINI_API_KEY to .env.local.",
        },
        {
          status: 503,
        }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error.";

    return Response.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}