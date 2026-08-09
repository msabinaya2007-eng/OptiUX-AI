import type { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { validateAnalysisResult } from "@/lib/validation";
import type {
  AnalysisRequest,
  UXAnalysisResult,
} from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = "gemini-3.5-flash";

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert AI-powered UX and UI evaluator.

Your job is to analyze screenshots or video frames provided by the user and produce a detailed, evidence-based UX evaluation.

You specialize in:

- User Experience Design
- User Interface Design
- Accessibility
- Usability
- Visual Hierarchy
- Interaction Design
- Cognitive Load
- Human-Computer Interaction

IMPORTANT:

Analyze ONLY what is visually observable in the provided images.

Do not invent UI elements that are not visible.

Do not assume functionality that cannot be observed.

Do not claim that something exists unless it is visible in the provided input.

You MUST return valid JSON matching EXACTLY this structure:

{
  "overallScore": 0,
  "summary": "Short summary of the overall UX quality.",
  "categories": {
    "accessibility": 0,
    "usability": 0,
    "visualHierarchy": 0,
    "interactionCost": 0,
    "cognitiveLoad": 0
  },
  "strengths": [
    "Strength 1",
    "Strength 2",
    "Strength 3"
  ],
  "issues": [
    {
      "id": "issue-1",
      "title": "Short issue title",
      "category": "Accessibility",
      "severity": "critical",
      "description": "Detailed explanation of the UX issue.",
      "evidence": "Specific visual evidence observed in the provided image.",
      "recommendation": "Specific actionable recommendation to fix the issue."
    }
  ],
  "replayTimeline": [
  {
    "timestamp": "00:12",
    "event": "User opens the navigation menu",
    "status": "success",
    "observation": "Navigation options are clearly visible"
  },
  {
    "timestamp": "00:24",
    "event": "User attempts to continue",
    "status": "friction",
    "observation": "Primary action is difficult to identify",
    "severity": "high"
  }
]
  "recommendations": [
    {
      "title": "Recommendation title",
      "impact": "High",
      "description": "Detailed explanation of the recommended UX improvement."
    }
  ]
}

SCORING:

All scores must be numbers between 0 and 100.

Higher scores mean better UX.

90-100 = Excellent
75-89 = Good
60-74 = Needs Improvement
40-59 = Poor
0-39 = Critical Problems

Evaluate these five categories:

1. Accessibility
2. Usability
3. Visual Hierarchy
4. Interaction Cost
5. Cognitive Load

ISSUE RULES:

Identify real UX problems visible in the provided input.

Each issue must include:

- Unique ID
- Clear title
- Valid category
- Severity
- Detailed description
- Visual evidence
- Practical recommendation

Allowed categories:

- Accessibility
- Usability
- Visual Hierarchy
- Interaction Cost
- Cognitive Load

Allowed severity values:

- critical
- high
- medium
- low

RECOMMENDATION RULES:

Provide practical recommendations that directly address observed UX issues.

Allowed impact values:

- High
- Medium
- Low

IMPORTANT:

- Base findings ONLY on visible evidence.
- Do not invent information.
- Do not give uniformly high scores.
- Do not give uniformly low scores.
- Be honest and critical.
- Mention both strengths and weaknesses.
- Provide at least 3 issues when sufficient evidence exists.
- Provide at least 3 recommendations when sufficient evidence exists.
- For screenshots, evaluate the visible interface.
- For video frames, evaluate the user flow across frames.
- Compare multiple frames when possible.
- Identify changes between frames.
- Identify repeated UI patterns when relevant.
- Consider accessibility issues that can be visually evaluated.
- Consider mobile responsiveness only if mobile screens are provided.
- Consider desktop responsiveness only if desktop screens are provided.

MOST IMPORTANT:

Return ONLY the JSON object.

Do NOT use Markdown.

Do NOT wrap the JSON in code fences.

Do NOT include explanations before or after the JSON.

VIDEO REPLAY ANALYSIS:

When the input type is video, analyze the frames as a chronological user journey.

Create a replayTimeline array containing important moments in the interaction.

For each moment:
- Estimate the timestamp based on the frame position.
- Describe what the user appears to be doing.
- Mark the interaction as success, friction, error, or neutral.
- Explain the UX observation.
- Include severity when there is a UX problem.

Look specifically for:
- hesitation
- repeated clicks
- navigation confusion
- unnecessary interactions
- errors
- unclear buttons
- confusing layouts
- unexpected states
- successful task completion

IMPORTANT:
Only report interactions that can reasonably be inferred from the provided video frames.
Do not invent user actions that cannot be observed.
`;

function buildUserPrompt(
  request: AnalysisRequest
): string {
  const parts: string[] = [];

  parts.push(
    "You are performing a UX analysis for OptiUX-AI."
  );

  if (request.context) {
    const context = request.context;

    if (context.projectName) {
      parts.push(
        `Project Name: ${context.projectName}`
      );
    }

    if (context.targetAudience) {
      parts.push(
        `Target Audience: ${context.targetAudience}`
      );
    }

    if (context.productDescription) {
      parts.push(
        `Product Description: ${context.productDescription}`
      );
    }

    if (context.uxGoals) {
      parts.push(
        `UX Goals: ${context.uxGoals}`
      );
    }
  }

  parts.push("");

  if (
    request.inputType === "screenshots"
  ) {
    parts.push(`
INPUT TYPE: SCREENSHOTS

Analyze the provided screenshot(s).

Evaluate:

- Layout
- Navigation
- Typography
- Color usage
- Contrast
- Spacing
- Visual hierarchy
- CTA prominence
- Information architecture
- Accessibility
- Usability
- Cognitive load
- Interaction cost
- Consistency
- Error prevention
- User guidance

Base every finding on visible evidence.
`);
  }

  if (
    request.inputType === "video"
  ) {
    parts.push(`
INPUT TYPE: VIDEO FRAMES

The provided images are representative frames extracted from a user interaction video.

Analyze them as a sequence.

Evaluate:

- Navigation flow
- Interaction patterns
- Visual feedback
- State changes
- CTA visibility
- User guidance
- Number of interaction steps
- Interaction cost
- Cognitive load
- Consistency between screens
- Transitions between screens
- Potential usability problems

Compare the frames in sequence whenever possible.

Pay attention to how the interface changes from one frame to another.

Base every finding ONLY on the visible frames.
`);
  }

  parts.push(`
The provided images are the primary source of evidence.

Do not assume functionality that cannot be observed.

Return the complete UX analysis using the required JSON schema.
`);

  return parts.join("\n");
}

function convertToGeminiPart(
  image: string
) {
  /*
   * Supports:
   *
   * data:image/png;base64,...
   * data:image/jpeg;base64,...
   * data:image/webp;base64,...
   *
   * Also supports raw base64 strings.
   */

  const match = image.match(
    /^data:(image\/[^;]+);base64,(.+)$/
  );

  if (match) {
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }

  return {
    inlineData: {
      mimeType: "image/jpeg",
      data: image,
    },
  };
}

async function callGemini(
  prompt: string,
  images: string[]
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  /*
   * Limit the number of images sent to Gemini.
   *
   * This prevents extremely large requests.
   */

  const selectedImages =
    images.slice(0, 10);

  const imageParts =
    selectedImages.map(
      convertToGeminiPart
    );

  const response =
    await ai.models.generateContent({
      model: GEMINI_MODEL,

      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `${SYSTEM_PROMPT}\n\n${prompt}`,
            },
            ...imageParts,
          ],
        },
      ],

      config: {
        temperature: 0.3,

        responseMimeType:
          "application/json",
      },
    });

  return response.text || "";
}

function extractJSON(
  text: string
): unknown {
  let cleaned =
    text.trim();

  /*
   * Remove Markdown code fences
   * if Gemini accidentally returns them.
   */

  if (
    cleaned.startsWith(
      "```json"
    )
  ) {
    cleaned = cleaned
      .replace(
        /^```json/,
        ""
      )
      .replace(
        /```$/,
        ""
      )
      .trim();
  } else if (
    cleaned.startsWith("```")
  ) {
    cleaned = cleaned
      .replace(
        /^```/,
        ""
      )
      .replace(
        /```$/,
        ""
      )
      .trim();
  }

  /*
   * First try parsing the
   * complete response.
   */

  try {
    return JSON.parse(
      cleaned
    );
  } catch {
    // Continue with fallback.
  }

  /*
   * Fallback:
   * Find the JSON object.
   */

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
    );
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
     * 1. Check API key.
     */

    if (!GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "Gemini AI is not configured. Add GEMINI_API_KEY to .env.local.",
        },
        {
          status: 503,
        }
      );
    }

    /*
     * 2. Read request.
     */

    const body: AnalysisRequest =
      await request.json();

    /*
     * 3. Validate input type.
     */

    if (!body.inputType) {
      return Response.json(
        {
          error:
            "Missing input type.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 4. Only support screenshots
     * and video.
     */

    if (
      body.inputType !==
        "screenshots" &&
      body.inputType !==
        "video"
    ) {
      return Response.json(
        {
          error:
            "OptiUX-AI currently supports screenshot and video analysis only.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 5. Validate screenshots.
     */

    if (
      body.inputType ===
      "screenshots"
    ) {
      if (
        !body.screenshots ||
        body.screenshots.length === 0
      ) {
        return Response.json(
          {
            error:
              "At least one screenshot is required.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * 6. Validate video frames.
     */

    if (
      body.inputType ===
      "video"
    ) {
      if (
        !body.videoFrames ||
        body.videoFrames.length === 0
      ) {
        return Response.json(
          {
            error:
              "No video frames were provided.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * 7. Build AI prompt.
     */

    const userPrompt =
      buildUserPrompt(body);

    /*
     * 8. Get images.
     */

    let images: string[] = [];

    if (
      body.inputType ===
        "screenshots" &&
      body.screenshots
    ) {
      images =
        body.screenshots;
    }

    if (
      body.inputType ===
        "video" &&
      body.videoFrames
    ) {
      images =
        body.videoFrames;
    }

    /*
     * 9. Call Gemini.
     */

    const aiResponse =
      await callGemini(
        userPrompt,
        images
      );

    /*
     * 10. Parse response.
     */

    let parsed: unknown;

    try {
      parsed =
        extractJSON(
          aiResponse
        );
    } catch (error) {
      console.error(
        "Gemini returned invalid JSON:",
        aiResponse
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid UX analysis. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 11. Validate result.
     */

    if (
      !validateAnalysisResult(
        parsed
      )
    ) {
      console.error(
        "Invalid analysis result:",
        parsed
      );

      return Response.json(
        {
          error:
            "Gemini response did not match the expected UX analysis format.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 12. Return validated result.
     */

    const result:
      UXAnalysisResult =
      parsed;

    return Response.json({
      result,
    });
  } catch (error) {
    console.error(
      "OptiUX-AI analysis error:",
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