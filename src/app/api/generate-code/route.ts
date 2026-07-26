import type { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  UXIssue,
  UXRecommendation,
  AnalysisContext,
} from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use the same Gemini model that is working for your UX analysis.
const GEMINI_MODEL = "gemini-3.5-flash";

interface GenerateCodeRequest {
  issues: UXIssue[];
  recommendations: UXRecommendation[];
  technology: string;
  context?: AnalysisContext;
}

interface GeneratedCodeBlock {
  issueTitle: string;
  recommendation: string;
  code: string;
}

interface GeneratedCodeResponse {
  blocks: GeneratedCodeBlock[];
}

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert frontend developer and UX engineer.

Your job is to generate improved frontend code based on UX issues and recommendations identified by an AI UX evaluation.

The goal is to provide real, functional, production-quality frontend code that directly addresses the identified UX problems.

Return valid JSON matching EXACTLY this structure:

{
  "blocks": [
    {
      "issueTitle": "The UX issue this code addresses",
      "recommendation": "The UX recommendation being implemented",
      "code": "The complete functional code snippet"
    }
  ]
}

IMPORTANT RULES:

1. Generate real, functional code.
2. Do not generate pseudocode.
3. Follow best practices for the requested technology.
4. Each code block should address one specific UX issue.
5. Focus on the most important UX issues first.
6. Prioritize critical and high-severity issues.
7. Include proper imports when using React, Next.js, or other frameworks.
8. Include clear code comments explaining the UX improvements.
9. Make the code accessible.
10. Follow semantic HTML practices where applicable.
11. Use appropriate ARIA attributes when necessary.
12. Improve keyboard accessibility where relevant.
13. Improve visual hierarchy where relevant.
14. Reduce unnecessary interaction steps where relevant.
15. Reduce cognitive load where relevant.
16. Improve CTA visibility where relevant.
17. Improve readability and usability where relevant.

IMPORTANT:

The generated code must match the requested technology.

If the technology is:
- React: Generate React code.
- Next.js: Generate Next.js compatible code.
- HTML/CSS: Generate HTML and CSS.
- TypeScript: Generate TypeScript code.
- JavaScript: Generate JavaScript code.

Do not invent technologies that were not requested.

Return ONLY the JSON object.

Do NOT use Markdown code fences.

Do NOT include explanations before or after the JSON.
`;

async function generateCodeWithGemini(
  userPrompt: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add your Gemini API key to .env.local."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,

    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_PROMPT}

${userPrompt}`,
          },
        ],
      },
    ],

    config: {
      temperature: 0.3,

      responseMimeType: "application/json",
    },
  });

  return response.text || "";
}

function extractJSON(text: string): unknown {
  let cleaned = text.trim();

  // Remove JSON Markdown code fences if Gemini returns them.
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }

  // Try parsing the complete response.
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with fallback.
  }

  // Find JSON object inside the response.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {
    const jsonString = cleaned.slice(
      start,
      end + 1
    );

    return JSON.parse(jsonString);
  }

  throw new Error(
    "Gemini did not return valid JSON."
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. Check Gemini API key.
     */

    if (!GEMINI_API_KEY) {
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

    /*
     * 2. Read request body.
     */

    const body: GenerateCodeRequest =
      await request.json();

    /*
     * 3. Validate UX issues.
     */

    if (
      !body.issues ||
      body.issues.length === 0
    ) {
      return Response.json(
        {
          error:
            "No UX issues were provided for code generation.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 4. Validate technology.
     */

    if (!body.technology) {
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

    /*
     * 5. Prepare UX issue summary.
     */

    const issuesSummary =
      body.issues
        .map(
          (issue, index) =>
            `${index + 1}. [${issue.severity}] ${issue.title}
Category: ${issue.category}
Description: ${issue.description}
Evidence: ${issue.evidence}
Recommendation: ${issue.recommendation}`
        )
        .join("\n\n");

    /*
     * 6. Prepare recommendations summary.
     */

    const recsSummary =
      body.recommendations
        ?.map(
          (recommendation, index) =>
            `${index + 1}. [${recommendation.impact}] ${recommendation.title}
Description: ${recommendation.description}`
        )
        .join("\n\n") ||
      "No additional recommendations provided.";

    /*
     * 7. Prepare project context.
     */

    let contextStr = "";

    if (body.context) {
      if (body.context.projectName) {
        contextStr +=
          `Project: ${body.context.projectName}\n`;
      }

      if (body.context.targetAudience) {
        contextStr +=
          `Target Audience: ${body.context.targetAudience}\n`;
      }

      if (body.context.productDescription) {
        contextStr +=
          `Product Description: ${body.context.productDescription}\n`;
      }

      if (body.context.uxGoals) {
        contextStr +=
          `UX Goals: ${body.context.uxGoals}\n`;
      }
    }

    /*
     * 8. Build Gemini prompt.
     */

    const userPrompt = `
Generate improved frontend code using:

Technology:
${body.technology}

${contextStr
  ? `Project Context:
${contextStr}
`
  : ""}

UX Issues Identified:

${issuesSummary}

UX Recommendations:

${recsSummary}

TASK:

Generate improved frontend code that directly addresses the most important UX issues.

Prioritize:
1. Critical severity issues.
2. High severity issues.
3. Medium severity issues.
4. Low severity issues.

For each major UX issue, generate a separate code block.

Each code block must contain:
- The UX issue being addressed.
- The recommendation being implemented.
- Complete functional frontend code.

Make sure the generated code is compatible with:
${body.technology}

Return ONLY the required JSON structure.
`;

    /*
     * 9. Call Gemini.
     */

    const aiContent =
      await generateCodeWithGemini(
        userPrompt
      );

    /*
     * 10. Parse Gemini response.
     */

    let parsed: unknown;

    try {
      parsed = extractJSON(
        aiContent
      );
    } catch (error) {
      console.error(
        "Gemini returned invalid JSON:",
        aiContent
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid code generation response. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 11. Validate generated blocks.
     */

    const generated =
      parsed as GeneratedCodeResponse;

    if (
      !generated ||
      !Array.isArray(
        generated.blocks
      )
    ) {
      return Response.json(
        {
          error:
            "Gemini response did not contain valid generated code blocks.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 12. Return generated code.
     */

    return Response.json({
      blocks: generated.blocks,
      technology:
        body.technology,
    });
  } catch (error) {
    console.error(
      "OptiUX-AI code generation error:",
      error
    );

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