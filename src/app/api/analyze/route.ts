import type { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { chromium } from "playwright";
import { validateAnalysisResult } from "@/lib/validation";
import type {
  AnalysisRequest,
  UXAnalysisResult,
} from "@/types";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use the same Gemini model that is working for your UX analysis.
const GEMINI_MODEL = "gemini-3.5-flash";

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert AI-powered UX and UI evaluator.

Your job is to analyze screenshots, website screenshots, or video frames provided by the user and produce a detailed, evidence-based UX evaluation.

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
    }
  ],
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
- For website screenshots, evaluate the visible rendered website.
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

ONLY when the input type is VIDEO, analyze the frames as a chronological user journey.

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

For SCREENSHOTS and URL analysis:

DO NOT generate replayTimeline.

For URL analysis, the website is captured as a static screenshot, so there is no actual user journey to replay.

Do not invent user actions that cannot be observed.
`;


/* =======================================================
   BUILD USER PROMPT
======================================================= */

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

  /* -------------------------------------------------------
     SCREENSHOTS
  ------------------------------------------------------- */

  if (request.inputType === "screenshots") {
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

IMPORTANT:

This is a static screenshot analysis.

DO NOT generate replayTimeline.

Base every finding on visible evidence.
`);
  }


  /* -------------------------------------------------------
     VIDEO
  ------------------------------------------------------- */

  if (request.inputType === "video") {
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

Create the replayTimeline because this is a VIDEO analysis.

Base every finding ONLY on the visible frames.
`);
  }


  /* -------------------------------------------------------
     URL
  ------------------------------------------------------- */

  if (request.inputType === "url") {
    parts.push(`
INPUT TYPE: LIVE WEBSITE URL

Website URL:

${request.url}

The application has opened this website using Playwright and captured its rendered interface as an image.

Analyze the captured website interface as a real user-facing website.

Evaluate:

- Overall usability
- Accessibility
- Visual hierarchy
- Navigation clarity
- Typography
- Color usage
- Contrast
- Spacing
- Layout consistency
- CTA visibility
- Information architecture
- Interaction cost
- Cognitive load
- User guidance
- Visual consistency
- Content organization
- Error prevention
- Trust and clarity

Pay particular attention to:

- Whether the primary purpose of the page is immediately understandable
- Whether important actions are visually clear
- Whether navigation is easy to understand
- Whether content is organized logically
- Whether the visual hierarchy guides the user naturally
- Whether there are obvious accessibility concerns
- Whether the interface feels cluttered or confusing
- Whether spacing and alignment are consistent

IMPORTANT:

This is a static website screenshot analysis.

DO NOT generate replayTimeline.

Do not claim that an interaction works or fails unless it can be visually determined.

Do not invent hidden functionality.

Base every finding ONLY on what is visually observable in the captured website screenshot.
`);
  }


  parts.push(`
The provided images are the primary source of evidence.

Do not assume functionality that cannot be observed.

Return the complete UX analysis using the required JSON schema.
`);

  return parts.join("\n");
}


/* =======================================================
   CONVERT IMAGE TO GEMINI PART
======================================================= */

function convertToGeminiPart(image: string) {
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


/* =======================================================
   CAPTURE WEBSITE WITH PLAYWRIGHT
======================================================= */

async function captureWebsite(
  url: string
): Promise<string> {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
      deviceScaleFactor: 1,
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Allow dynamic content, images and fonts to load.
    await page.waitForTimeout(3000);

    const screenshot =
      await page.screenshot({
        type: "jpeg",
        quality: 85,
        fullPage: false,
      });

    return screenshot.toString("base64");

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


/* =======================================================
   CALL GEMINI
======================================================= */

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
        responseMimeType: "application/json",
      },
    });

  return response.text || "";
}


/* =======================================================
   EXTRACT JSON
======================================================= */

function extractJSON(
  text: string
): unknown {

  let cleaned =
    text.trim();

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

  try {
    return JSON.parse(
      cleaned
    );

  } catch {
    // Continue and try extracting JSON.
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
    );
  }

  throw new Error(
    "Gemini did not return valid JSON."
  );
}


/* =======================================================
   VALIDATE WEBSITE URL
======================================================= */

function validateWebsiteUrl(
  value: string
): boolean {

  try {
    const parsed =
      new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );

  } catch {
    return false;
  }
}


/* =======================================================
   POST /api/analyze
======================================================= */

export async function POST(
  request: NextRequest
) {

  try {

    /* ---------------------------------------------------
       1. CHECK GEMINI API KEY
    --------------------------------------------------- */

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


    /* ---------------------------------------------------
       2. READ REQUEST
    --------------------------------------------------- */

    const body: AnalysisRequest =
      await request.json();


    /* ---------------------------------------------------
       3. VALIDATE INPUT TYPE
    --------------------------------------------------- */

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


    if (
      body.inputType !== "screenshots" &&
      body.inputType !== "video" &&
      body.inputType !== "url"
    ) {
      return Response.json(
        {
          error:
            "Invalid analysis input type.",
        },
        {
          status: 400,
        }
      );
    }


    /* ---------------------------------------------------
       4. VALIDATE SCREENSHOTS
    --------------------------------------------------- */

    if (
      body.inputType === "screenshots"
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


    /* ---------------------------------------------------
       5. VALIDATE VIDEO
    --------------------------------------------------- */

    if (
      body.inputType === "video"
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


    /* ---------------------------------------------------
       6. VALIDATE URL
    --------------------------------------------------- */

    if (
      body.inputType === "url"
    ) {

      if (!body.url) {
        return Response.json(
          {
            error:
              "Website URL is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !validateWebsiteUrl(
          body.url
        )
      ) {
        return Response.json(
          {
            error:
              "Please provide a valid website URL starting with http:// or https://",
          },
          {
            status: 400,
          }
        );
      }
    }


    /* ---------------------------------------------------
       7. BUILD USER PROMPT
    --------------------------------------------------- */

    const userPrompt =
      buildUserPrompt(
        body
      );


    /* ---------------------------------------------------
       8. PREPARE IMAGES
    --------------------------------------------------- */

    let images: string[] = [];


    /* SCREENSHOTS */

    if (
      body.inputType === "screenshots" &&
      body.screenshots
    ) {
      images =
        body.screenshots;
    }


    /* VIDEO */

    if (
      body.inputType === "video" &&
      body.videoFrames
    ) {
      images =
        body.videoFrames;
    }


    /* URL */

    if (
      body.inputType === "url"
    ) {

      try {

        console.log(
          "Capturing website:",
          body.url
        );

        const websiteScreenshot =
          await captureWebsite(
            body.url!
          );

        images = [
          websiteScreenshot,
        ];

        console.log(
          "Website screenshot captured successfully."
        );

      } catch (error) {

        console.error(
          "Website capture failed:",
          error
        );

        return Response.json(
          {
            error:
              "Unable to open or capture the website. Make sure the URL is publicly accessible and try again.",
          },
          {
            status: 502,
          }
        );
      }
    }


    /* ---------------------------------------------------
       9. CALL GEMINI
    --------------------------------------------------- */

    const aiResponse =
      await callGemini(
        userPrompt,
        images
      );


    /* ---------------------------------------------------
       10. PARSE GEMINI RESPONSE
    --------------------------------------------------- */

    let parsed: unknown;

    try {

      parsed =
        extractJSON(
          aiResponse
        );

    } catch {

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


    /* ---------------------------------------------------
       11. VALIDATE ANALYSIS
    --------------------------------------------------- */

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


    /* ---------------------------------------------------
       12. CREATE RESULT
    --------------------------------------------------- */

    const result:
      UXAnalysisResult =
      parsed;


    /* ---------------------------------------------------
       13. UX REPLAY ONLY FOR VIDEO
    --------------------------------------------------- */

    if (
      body.inputType !== "video"
    ) {
      delete result.replayTimeline;
    }


    /* ---------------------------------------------------
       14. RETURN RESULT
    --------------------------------------------------- */

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