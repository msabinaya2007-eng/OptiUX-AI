import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import {
  dataUrlToGeminiPart,
  describeImageData,
  formatQuotaError,
  generateGeminiContent,
  isValidImageDataUrl,
  type GeminiImagePart,
} from "@/lib/ai/gemini";

import { captureWebsite } from "@/lib/capture/website";

import { saveAnalysis } from "@/lib/analyse/store";

import { validateAnalysisResult } from "@/lib/validation";

import type {
  AnalysisRequest,
  UXAnalysisResult,
} from "@/types";

const MAX_VIDEO_FRAMES = 10;

type CaptureResult = {
  screenshot: string;
  title: string;
  description: string;
  url: string;
};

/* =========================================================
   SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT = `
You are OptiUX-AI, an expert AI-powered UX evaluation system.

Your task is to analyze websites, applications, screenshots,
and recorded user interactions from a UX perspective.

Evaluate the interface across these five categories:

1. accessibility
2. usability
3. visualHierarchy
4. interactionCost
5. cognitiveLoad

Your analysis must be practical, specific, and actionable.

IMPORTANT:

- Do not invent UI elements that are not visible.
- Base observations on the provided visual evidence.
- Give clear evidence for every identified issue.
- Prioritize issues by severity.
- Recommendations must directly address the identified problems.
- Scores must be between 0 and 100.
- Higher scores mean better UX.
- Be concise but useful.

Return ONLY valid JSON.

The JSON must follow this structure:

{
  "overallScore": 0,
  "summary": "",
  "categories": {
    "accessibility": 0,
    "usability": 0,
    "visualHierarchy": 0,
    "interactionCost": 0,
    "cognitiveLoad": 0
  },
  "strengths": [],
  "issues": [
    {
      "id": "",
      "title": "",
      "category": "",
      "severity": "critical",
      "description": "",
      "evidence": "",
      "recommendation": ""
    }
  ],
  "recommendations": [
    {
      "title": "",
      "impact": "High",
      "description": ""
    }
  ]
}

For video analysis, you may additionally provide:

"replayTimeline": [
  {
    "timestamp": "",
    "event": "",
    "status": "success",
    "observation": "",
    "severity": "low"
  }
]

Possible severity values:

critical, high, medium, low.

Possible timeline status values:

success, friction, error, neutral.

Do not include replayTimeline for screenshots or URLs unless
the request explicitly provides meaningful interaction evidence.
`;

/* =========================================================
   CONVERT BASE64 IMAGES → GEMINI IMAGE PARTS
========================================================= */

/*
 * All images (URL captures, uploaded screenshots,
 * video frames) must arrive as base64 data URLs:
 *
 *   data:image/png;base64,AAAA...
 *   data:image/jpeg;base64,AAAA...
 *   data:image/webp;base64,AAAA...
 *
 * Validation and conversion are handled by
 * dataUrlToGeminiPart() in src/lib/ai/gemini.ts.
 * Here we only add context about WHICH input failed,
 * using safe metadata only (never the full base64).
 */

type ImageSourceKind =
  | "website capture"
  | "screenshot"
  | "video frame";

function convertImagesToGeminiParts(
  images: string[],
  source: ImageSourceKind
): GeminiImagePart[] {
  return images.map((image, index) => {
    console.log(
      `[OptiUX] ${source} ${index + 1}/${images.length} metadata:`,
      describeImageData(image)
    );

    if (
      !isValidImageDataUrl(
        image
      )
    ) {
      const metadata =
        describeImageData(image);

      let detail = "";

      if (metadata.isBlobUrl) {
        detail =
          " A browser blob URL was received instead of image bytes. The client must convert files to base64 data URLs before uploading.";
      } else if (!metadata.isDataUrl) {
        detail =
          " The value received is not a data:image/...;base64,... URL.";
      }

      throw new Error(
        `Invalid ${source} data received by the server (${source} ${index + 1} of ${images.length}). Expected a base64 image data URL.${detail}`
      );
    }

    try {
      return dataUrlToGeminiPart(
        image
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown conversion error.";

      throw new Error(
        `Invalid ${source} data received by the server (${source} ${index + 1} of ${images.length}). Expected a base64 image data URL. ${message}`
      );
    }
  });
}

/* =========================================================
   EXTRACT JSON FROM GEMINI RESPONSE
========================================================= */

function extractJson(text: string): unknown {
  let cleaned = text.trim();

  // Remove markdown JSON fences if Gemini adds them.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // First attempt: parse the complete response.
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with fallback extraction.
  }

  // Fallback: find the outermost JSON object.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {
    const possibleJson = cleaned.slice(
      start,
      end + 1
    );

    return JSON.parse(possibleJson);
  }

  throw new Error(
    "Gemini returned invalid JSON."
  );
}

/* =========================================================
   BUILD ANALYSIS PROMPT
========================================================= */

function buildAnalysisPrompt(
  body: AnalysisRequest,
  images: string[],
  websiteInfo?: CaptureResult
): string {
  const context = body.context || {};

  const contextText = `
Project name:
${context.projectName || "Not provided"}

Target audience:
${context.targetAudience || "Not provided"}

Product description:
${context.productDescription || "Not provided"}

UX goals:
${context.uxGoals || "Not provided"}
`;

  let evidenceText = "";

  /* -------------------------------------------------------
     URL INPUT
  ------------------------------------------------------- */

  if (
    body.inputType === "url" &&
    body.url
  ) {
    evidenceText = `
Input type: Website URL

Website URL:
${websiteInfo?.url || body.url}

Website title:
${websiteInfo?.title || "Unknown"}

Website description:
${websiteInfo?.description || "Unknown"}

The attached image is a screenshot captured from
the supplied website URL.

Analyze the actual visible interface in the screenshot.

Pay particular attention to:

- visual hierarchy
- navigation
- layout
- spacing
- typography
- color contrast
- accessibility indicators
- calls to action
- content organization
- usability
- interaction cost
- cognitive load

Do not assume functionality that cannot be observed.
`;
  }

  /* -------------------------------------------------------
     SCREENSHOT INPUT
  ------------------------------------------------------- */

  if (
    body.inputType === "screenshots"
  ) {
    evidenceText = `
Input type: UI screenshots

The attached images are screenshots provided by the user.

Analyze the visible interface carefully.

Focus on:

- layout
- spacing
- typography
- colors
- contrast
- hierarchy
- navigation
- buttons
- forms
- accessibility
- usability
- cognitive load
- interaction cost
`;
  }

  /* -------------------------------------------------------
     VIDEO INPUT
  ------------------------------------------------------- */

  if (
    body.inputType === "video"
  ) {
    evidenceText = `
Input type: Website/application video

The attached images are representative frames
extracted from the uploaded video.

Analyze:

- visual interface
- interaction flow
- friction
- errors
- navigation
- cognitive load
- interaction cost
- visual hierarchy
- usability

If the frame sequence provides enough evidence,
create a replayTimeline.
`;
  }

  return `
Analyze the provided UI evidence.

${contextText}

${evidenceText}

Number of visual inputs:
${images.length}

Return a complete UX analysis following
the required JSON schema.

IMPORTANT:

Every issue must be supported by visible evidence.

Do not invent features, interactions, buttons,
text, or UI elements that are not visible.

Provide useful and actionable recommendations.
`;
}

/* =========================================================
   POST /api/analyze
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       PARSE REQUEST
    ===================================================== */

    const body =
      (await request.json()) as AnalysisRequest;

    if (!body) {
      return Response.json(
        {
          error:
            "Request body is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.inputType) {
      return Response.json(
        {
          error:
            "inputType is required.",
        },
        {
          status: 400,
        }
      );
    }

    let images: string[] = [];

    let websiteInfo:
      | CaptureResult
      | undefined;

    /* =====================================================
       URL INPUT
    ===================================================== */

    if (
      body.inputType === "url"
    ) {
      if (!body.url) {
        return Response.json(
          {
            error:
              "URL is required.",
          },
          {
            status: 400,
          }
        );
      }

      console.log(
        `[OptiUX] Starting URL analysis: ${body.url}`
      );

      websiteInfo =
        await captureWebsite(
          body.url
        );

      images = [
        websiteInfo.screenshot,
      ];

      console.log(
        "[OptiUX] Website captured successfully."
      );
    }

    /* =====================================================
       SCREENSHOT INPUT
    ===================================================== */

    else if (
      body.inputType === "screenshots"
    ) {
      images =
        Array.isArray(
          body.screenshots
        )
          ? body.screenshots
          : [];

      if (
        images.length === 0
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

    /* =====================================================
       VIDEO INPUT
    ===================================================== */

    else if (
      body.inputType === "video"
    ) {
      images =
        Array.isArray(
          body.videoFrames
        )
          ? body.videoFrames
          : [];

      if (
        images.length === 0
      ) {
        return Response.json(
          {
            error:
              "Video frames are required.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* =====================================================
       INVALID INPUT TYPE
    ===================================================== */

    else {
      return Response.json(
        {
          error:
            "Unsupported input type.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       LIMIT IMAGES
    ===================================================== */

    images = images.slice(
      0,
      MAX_VIDEO_FRAMES
    );

    if (images.length === 0) {
      return Response.json(
        {
          error:
            "No visual evidence was provided.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       BUILD PROMPT
    ===================================================== */

    const prompt =
      buildAnalysisPrompt(
        body,
        images,
        websiteInfo
      );

    /* =====================================================
       CONVERT IMAGES
    ===================================================== */

    console.log(
      `[OptiUX] Converting ${images.length} image(s) for Gemini...`
    );

    const imageSourceKind: ImageSourceKind =
      body.inputType === "url"
        ? "website capture"
        : body.inputType === "screenshots"
          ? "screenshot"
          : "video frame";

    let imageParts: GeminiImagePart[];

    try {
      imageParts =
        convertImagesToGeminiParts(
          images,
          imageSourceKind
        );
    } catch (error) {
      console.error(
        "[OptiUX] Image conversion failed:",
        error
      );

      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid image data.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       SEND TO GEMINI
    ===================================================== */

    console.log(
      "[OptiUX] Sending UX evidence to Gemini..."
    );

    const rawResponse =
      await generateGeminiContent(
        `${SYSTEM_PROMPT}

${prompt}`,
        imageParts
      );

    /* =====================================================
       PARSE GEMINI JSON
    ===================================================== */

    let parsedResult:
      | UXAnalysisResult
      | undefined;

    try {
      parsedResult =
        extractJson(
          rawResponse
        ) as UXAnalysisResult;
    } catch (error) {
      console.error(
        "[OptiUX] Gemini JSON parse error:",
        error
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid analysis response.",
          details:
            error instanceof Error
              ? error.message
              : String(error),
        },
        {
          status: 502,
        }
      );
    }

    /* =====================================================
       VALIDATE RESULT
    ===================================================== */

    const isValid =
      validateAnalysisResult(
        parsedResult
      );

    if (!isValid) {
      console.error(
        "[OptiUX] Invalid UX analysis result."
      );

      return Response.json(
        {
          error:
            "AI returned an invalid UX analysis.",
        },
        {
          status: 502,
        }
      );
    }

    const result =
      parsedResult as UXAnalysisResult;

    /* =====================================================
       REPLAY TIMELINE
       ONLY VIDEO SHOULD HAVE REPLAY.
    ===================================================== */

    if (
      body.inputType !== "video"
    ) {
      delete result.replayTimeline;
    }

    /* =====================================================
       SAVE TO DATABASE
    ===================================================== */

    let savedId: string | undefined;

    try {
      savedId = await saveAnalysis({
        inputType: body.inputType,
        url: body.url,
        context: body.context,
        result,
        rawJson: parsedResult,
      });

      console.log(
        `[OptiUX] Analysis saved to database: ${savedId}`
      );
    } catch (dbError) {
      console.error(
        "[OptiUX] Failed to save analysis to database:",
        dbError
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    console.log(
      "[OptiUX] UX analysis completed successfully."
    );

    return Response.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[OptiUX] Analysis error:",
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

    const message =
      error instanceof Error
        ? error.message
        : String(error);

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