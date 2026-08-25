import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash";

/* =======================================================
   TYPES
======================================================= */

interface UXIssue {
  id?: string;
  title?: string;
  category?: string;
  severity?: string;
  description?: string;
  evidence?: string;
  recommendation?: string;
}

interface UXRecommendation {
  title?: string;
  impact?: string;
  description?: string;
}

interface AnalysisContext {
  projectName?: string;
  targetAudience?: string;
  productDescription?: string;
  uxGoals?: string;
}

interface GenerateDesignsRequest {
  issues: UXIssue[];
  recommendations: UXRecommendation[];
  context?: AnalysisContext;
}

interface DesignPrototype {
  name: string;
  tagline: string;
  description: string;
  html: string;
  css: string;
}

interface DesignGenerationResponse {
  designA: DesignPrototype;
  designB: DesignPrototype;
}

/* =======================================================
   SYSTEM PROMPT
======================================================= */

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert UX designer, product designer,
frontend engineer, and visual UI designer.

Your task is to create TWO completely rendered frontend
prototype designs based ONLY on the supplied UX analysis.

The user must be able to visually preview both designs.

=======================================================
DESIGN A — REFINED
=======================================================

Design A is a polished evolution of the existing interface.

Characteristics:

- Familiar and professional
- Low-risk redesign
- Preserve the existing product purpose
- Improve visual hierarchy
- Improve accessibility
- Improve readability
- Improve CTA clarity
- Reduce cognitive load
- Reduce unnecessary interaction
- Use subtle colors
- Clean spacing
- Modern but restrained
- Responsive
- Production-quality visual structure

=======================================================
DESIGN B — CREATIVE
=======================================================

Design B must be meaningfully different from Design A.

Characteristics:

- More creative visual direction
- Different layout or information hierarchy
- Stronger visual identity
- Modern and distinctive
- Still professional
- Still accessible
- Still easy to use
- Use subtle but attractive colors
- Do not use excessive gradients
- Do not sacrifice usability for decoration
- Responsive
- Production-quality visual structure

=======================================================
CRITICAL REQUIREMENT
=======================================================

YOU MUST GENERATE ACTUAL HTML AND CSS.

Do NOT return design descriptions instead of code.

Each design must contain:

1. Complete HTML markup
2. Complete CSS
3. A visually meaningful interface
4. Realistic placeholder content based on the supplied product context
5. Responsive layout
6. Accessible semantic HTML
7. Visible buttons and interaction elements
8. Clear typography hierarchy
9. Cards, sections, navigation, forms, or other UI elements
   appropriate to the product
10. Visual improvements that directly address the supplied
    UX issues

The HTML must be self-contained.

Do NOT use React.

Do NOT use JSX.

Do NOT use Next.js.

Do NOT use external JavaScript libraries.

Do NOT use external CSS frameworks.

Do NOT use external image URLs.

Do NOT use external fonts.

Do NOT use JavaScript.

Use only:

- HTML
- CSS

The generated prototype will be rendered inside a sandboxed
iframe.

=======================================================
HTML REQUIREMENTS
=======================================================

The HTML should contain ONLY the contents that belong inside
a webpage body.

Do NOT return:

<html>
<head>
<body>

Instead return something like:

<div class="app">
  ...
</div>

Use semantic elements where appropriate:

<header>
<nav>
<main>
<section>
<article>
<footer>
<button>
<form>
<label>

Use accessible labels and meaningful button text.

=======================================================
CSS REQUIREMENTS
=======================================================

The CSS must be complete and standalone.

Use modern CSS.

Prefer:

- CSS Grid
- Flexbox
- CSS variables
- responsive media queries
- subtle borders
- subtle shadows
- appropriate spacing
- accessible contrast
- visible focus states
- hover states

Avoid:

- excessive gradients
- excessive shadows
- neon colors
- huge text
- unnecessary animations
- clutter
- decorative elements that reduce usability

Include a responsive breakpoint around:

@media (max-width: 768px)

=======================================================
PRODUCT CONTENT
=======================================================

Use the supplied project context to understand what kind of
interface is being redesigned.

If project context is limited, infer ONLY the minimum UI
structure necessary from the supplied UX issues.

Do not invent unrelated features.

=======================================================
UX ISSUE REQUIREMENT
=======================================================

Every major UX issue provided in the prompt must influence
the redesign.

For example:

If the issue is poor visual hierarchy:
→ improve heading hierarchy, spacing, grouping, and CTA prominence.

If the issue is poor accessibility:
→ improve contrast, focus states, labels, semantic structure,
and readable text.

If the issue is high interaction cost:
→ reduce unnecessary steps and make primary actions obvious.

If the issue is cognitive overload:
→ simplify sections, group related information, and reduce
visual noise.

If the issue is unclear navigation:
→ create clearer navigation structure.

=======================================================
DESIGN DIFFERENCE
=======================================================

Design A and Design B MUST look noticeably different.

Design A:
refined, familiar, structured.

Design B:
creative, distinctive, alternative hierarchy.

Do not simply change the colors.

The layout itself should be meaningfully different.

=======================================================
OUTPUT
=======================================================

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT use code fences.

Do NOT include explanations outside the JSON.

Return EXACTLY:

{
  "designA": {
    "name": "Design A — Refined",
    "tagline": "Short catchy tagline",
    "description": "Short description",
    "html": "Complete HTML prototype",
    "css": "Complete CSS stylesheet"
  },
  "designB": {
    "name": "Design B — Creative",
    "tagline": "Short catchy tagline",
    "description": "Short description",
    "html": "Complete HTML prototype",
    "css": "Complete CSS stylesheet"
  }
}

IMPORTANT:

The html and css fields must contain actual working code.

Do not put explanations inside html or css.

Do not use Markdown code fences.

Return ONLY the JSON object.
`;

/* =======================================================
   WAIT
======================================================= */

async function wait(
  milliseconds: number
): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* =======================================================
   TEMPORARY GEMINI ERROR
======================================================= */

function isTemporaryGeminiError(
  status: number,
  message: string
): boolean {
  const lower = message.toLowerCase();

  return (
    status === 429 ||
    status === 503 ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("resource exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("temporarily")
  );
}

/* =======================================================
   EXTRACT STATUS CODE
======================================================= */

function extractStatusCode(
  error: unknown
): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status = error.status;

    if (typeof status === "number") {
      return status;
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const match = message.match(
    /\b(429|503)\b/
  );

  if (match) {
    return Number(match[1]);
  }

  return 0;
}

/* =======================================================
   CALL GEMINI
======================================================= */

async function generateDesignsWithGemini(
  prompt: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add your Gemini API key to .env.local."
    );
  }

  const maxAttempts = 3;

  let lastError =
    "Gemini design generation failed.";

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `Design generation request ${attempt}/${maxAttempts}`
      );

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}

${prompt}`,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.7,
              responseMimeType:
                "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data =
          (await response.json()) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  text?: string;
                }>;
              };
            }>;
          };

        const text =
          data.candidates?.[0]
            ?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error(
            "Gemini returned an empty design response."
          );
        }

        return text;
      }

      const errorText =
        await response.text();

      lastError =
        `Gemini API error (${response.status}): ${errorText.slice(
          0,
          500
        )}`;

      console.error(
        "Design generation request failed:",
        lastError
      );

      if (
        !isTemporaryGeminiError(
          response.status,
          errorText
        ) ||
        attempt === maxAttempts
      ) {
        break;
      }

      const delay =
        2000 *
        Math.pow(2, attempt - 1);

      console.log(
        `Retrying design generation in ${
          delay / 1000
        } seconds...`
      );

      await wait(delay);
    } catch (error: unknown) {
      lastError =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `Design generation attempt ${attempt} failed:`,
        error
      );

      if (
        attempt === maxAttempts
      ) {
        break;
      }

      const status =
        extractStatusCode(error);

      if (
        status !== 0 &&
        !isTemporaryGeminiError(
          status,
          lastError
        )
      ) {
        break;
      }

      const delay =
        2000 *
        Math.pow(2, attempt - 1);

      await wait(delay);
    }
  }

  throw new Error(
    `Gemini design generation failed after ${maxAttempts} attempts: ${lastError}`
  );
}

/* =======================================================
   EXTRACT JSON
======================================================= */

function extractJSON(
  text: string
): unknown {
  let cleaned =
    text.trim();

  cleaned = cleaned
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();

  try {
    return JSON.parse(
      cleaned
    ) as unknown;
  } catch {
    // Continue with fallback extraction.
  }

  const start =
    cleaned.indexOf("{");

  const end =
    cleaned.lastIndexOf("}");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {
    const jsonString =
      cleaned.slice(
        start,
        end + 1
      );

    return JSON.parse(
      jsonString
    ) as unknown;
  }

  throw new Error(
    "Gemini did not return valid JSON."
  );
}

/* =======================================================
   TYPE GUARDS
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

function isString(
  value: unknown
): value is string {
  return typeof value === "string";
}

/* =======================================================
   VALIDATE DESIGN
======================================================= */

function isValidDesign(
  value: unknown
): value is DesignPrototype {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.name) &&
    isString(value.tagline) &&
    isString(value.description) &&
    isString(value.html) &&
    isString(value.css) &&
    value.html.trim().length > 20 &&
    value.css.trim().length > 20
  );
}

/* =======================================================
   VALIDATE COMPLETE RESPONSE
======================================================= */

function isValidDesignResponse(
  value: unknown
): value is DesignGenerationResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isValidDesign(value.designA) &&
    isValidDesign(value.designB)
  );
}

/* =======================================================
   POST /api/generate-designs
======================================================= */

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    /* ===================================================
       1. API KEY
    =================================================== */

    if (!GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "AI design generation is not configured. Add GEMINI_API_KEY to .env.local.",
        },
        {
          status: 503,
        }
      );
    }

    /* ===================================================
       2. READ REQUEST
    =================================================== */

    const body =
      (await request.json()) as GenerateDesignsRequest;

    /* ===================================================
       3. VALIDATE ISSUES
    =================================================== */

    if (
      !Array.isArray(body.issues) ||
      body.issues.length === 0
    ) {
      return Response.json(
        {
          error:
            "No UX issues were provided for design generation.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===================================================
       4. PREPARE ISSUES
    =================================================== */

    const issuesSummary =
      body.issues
        .map(
          (
            issue,
            index
          ) =>
            `${index + 1}. [${issue.severity ?? "unknown"}] ${
              issue.title ?? "Untitled issue"
            }
Category: ${issue.category ?? "Unknown"}
Description: ${
              issue.description ??
              "Not provided"
            }
Evidence: ${
              issue.evidence ??
              "Not provided"
            }
Recommendation: ${
              issue.recommendation ??
              "Not provided"
            }`
        )
        .join("\n\n");

    /* ===================================================
       5. PREPARE RECOMMENDATIONS
    =================================================== */

    const recommendationsSummary =
      Array.isArray(
        body.recommendations
      ) &&
      body.recommendations.length > 0
        ? body.recommendations
            .map(
              (
                recommendation,
                index
              ) =>
                `${index + 1}. [${
                  recommendation.impact ??
                  "unknown"
                }] ${
                  recommendation.title ??
                  "Untitled recommendation"
                }
Description: ${
                  recommendation.description ??
                  "Not provided"
                }`
            )
            .join("\n\n")
        : "No additional recommendations provided.";

    /* ===================================================
       6. PREPARE CONTEXT
    =================================================== */

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

    /* ===================================================
       7. BUILD PROMPT
    =================================================== */

    const userPrompt = `
Create TWO complete visual frontend prototypes based on
the following UX analysis.

${
  contextSummary
    ? `PROJECT CONTEXT:

${contextSummary}
`
    : ""
}

=======================================================
UX ISSUES
=======================================================

${issuesSummary}

=======================================================
UX RECOMMENDATIONS
=======================================================

${recommendationsSummary}

=======================================================
TASK
=======================================================

Create:

DESIGN A
A refined, professional redesign that makes targeted
improvements while keeping the interface familiar.

DESIGN B
A creative redesign with a noticeably different layout
and visual hierarchy.

Both designs must directly address the UX issues above.

The prototypes must be actual HTML and CSS.

Do NOT return design descriptions only.

The HTML and CSS must be detailed enough to render a
convincing interface preview.

Use realistic content appropriate to the supplied project
context.

Make both designs:

- responsive
- accessible
- visually polished
- professional
- easy to scan
- keyboard-friendly
- clear in hierarchy
- optimized for usability

Use subtle colors and tasteful visual styling.

Do not create unrelated functionality.

Return the exact JSON structure requested by the system
instructions.
`;

    /* ===================================================
       8. CALL GEMINI
    =================================================== */

    const rawResponse =
      await generateDesignsWithGemini(
        userPrompt
      );

    /* ===================================================
       9. PARSE JSON
    =================================================== */

    let parsed: unknown;

    try {
      parsed =
        extractJSON(
          rawResponse
        );
    } catch (error: unknown) {
      console.error(
        "DESIGN JSON PARSE ERROR:",
        error
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid design response. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    /* ===================================================
       10. VALIDATE RESPONSE
    =================================================== */

    if (
      !isValidDesignResponse(
        parsed
      )
    ) {
      console.error(
        "INVALID DESIGN RESPONSE:",
        parsed
      );

      return Response.json(
        {
          error:
            "Gemini returned an incomplete visual design response. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    /* ===================================================
       11. RETURN
    =================================================== */

    return Response.json(
      {
        designA:
          parsed.designA,

        designB:
          parsed.designB,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      "OptiUX-AI design generation error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Design generation failed.";

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