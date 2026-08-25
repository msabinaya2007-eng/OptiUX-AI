import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash";

export type GeminiImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

/* =========================================================
   API KEY
========================================================= */

function ensureGeminiKey(): void {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to .env.local."
    );
  }
}

/* =========================================================
   IMAGE DATA URL VALIDATION
========================================================= */

/*
 * Matches ONLY valid base64 image data URLs:
 *
 *   data:image/png;base64,AAAA...
 *   data:image/jpeg;base64,AAAA...
 *   data:image/webp;base64,AAAA...
 *
 * Simple pattern, no unnecessary flags.
 */

const IMAGE_DATA_URL_PATTERN =
  /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

export function isValidImageDataUrl(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    IMAGE_DATA_URL_PATTERN.test(
      value.trim()
    )
  );
}

/* =========================================================
   SAFE METADATA (NEVER LOG FULL BASE64)
========================================================= */

export function describeImageData(
  value: unknown
): {
  prefix: string;
  length: number;
  isDataUrl: boolean;
  isBlobUrl: boolean;
} {
  if (typeof value !== "string") {
    return {
      prefix: `<${typeof value}>`,
      length: -1,
      isDataUrl: false,
      isBlobUrl: false,
    };
  }

  const trimmed = value.trim();

  return {
    prefix: trimmed.substring(0, 50),
    length: trimmed.length,
    isDataUrl:
      trimmed.startsWith("data:"),
    isBlobUrl:
      trimmed.startsWith("blob:"),
  };
}

/* =========================================================
   CONVERT IMAGE DATA → GEMINI IMAGE PART
========================================================= */

export function dataUrlToGeminiPart(
  imageData: unknown
): GeminiImagePart {
  if (typeof imageData !== "string" || !imageData.trim()) {
    throw new Error(
      "Invalid image data. Image must be a non-empty base64 data URL string."
    );
  }

  const trimmed = imageData.trim();

  console.log(
    "[Gemini] Image data metadata:",
    describeImageData(trimmed)
  );

  /* -------------------------------------------------------
     CASE 1: Valid image data URL
  ------------------------------------------------------- */

  if (
    IMAGE_DATA_URL_PATTERN.test(
      trimmed
    )
  ) {
    const match = trimmed.match(
      IMAGE_DATA_URL_PATTERN
    );

    if (!match) {
      throw new Error(
        "Invalid image data URL format."
      );
    }

    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  }

  /* -------------------------------------------------------
     CASE 2: Browser blob URL

     This must NEVER reach the backend. Blob URLs only
     exist in the browser that created them.
  ------------------------------------------------------- */

  if (trimmed.startsWith("blob:")) {
    throw new Error(
      "Browser blob URL received by the server instead of image bytes. Convert uploaded files to base64 data URLs before sending them to /api/analyze."
    );
  }

  /* -------------------------------------------------------
     CASE 3: Data URL with wrong or missing MIME type
  ------------------------------------------------------- */

  if (
    trimmed.startsWith("data:") &&
    !trimmed.startsWith("data:image/")
  ) {
    throw new Error(
      "Unsupported data URL received. Only image data URLs are accepted (e.g. data:image/png;base64,...)."
    );
  }

  /* -------------------------------------------------------
     INVALID
  ------------------------------------------------------- */

  throw new Error(
    "Invalid image data. Expected a base64 image data URL such as data:image/png;base64,..."
  );
}

/* =========================================================
   TEMPORARY GEMINI ERROR
========================================================= */

function isTemporaryGeminiError(
  error: unknown
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const lower =
    message.toLowerCase();

  /*
   * Permanent conditions — retrying will NOT help:
   *
   * - "PerDay": free-tier daily request cap
   *   (~20 requests/day/model) was exhausted.
   * - "billing": plan/billing action required.
   */

  if (
    lower.includes("perday") ||
    lower.includes("billing")
  ) {
    return false;
  }

  /*
   * Temporary conditions — retrying may help:
   * short rate-limit spikes (429), capacity
   * outages (503), model overload.
   */

  return (
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("temporarily") ||
    lower.includes("overloaded")
  );
}

/* =========================================================
   QUOTA ERROR FORMATTING
========================================================= */

/*
 * Translates Gemini quota / billing failures into a
 * clear user-facing message. Returns null when the
 * error is NOT quota-related.
 *
 * Daily caps (GenerateRequestsPerDay...) ignore the
 * short "retry in Ns" hint — the bucket only resets
 * at midnight Pacific Time (or on plan upgrade).
 */

export function formatQuotaError(
  error: unknown
): string | null {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const lower =
    message.toLowerCase();

  const isQuota =
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("billing");

  if (!isQuota) {
    return null;
  }

  if (
    lower.includes("perday") ||
    lower.includes("per_day")
  ) {
    return "Gemini free-tier daily quota is exhausted (~20 requests/day for this model). The limit resets at midnight Pacific Time. Alternatives: enable billing on your Google AI Studio plan, or set GEMINI_MODEL in .env.local to a different model (each model has its own quota bucket).";
  }

  let waitHint =
    " Please wait a minute and try again.";

  const retryMatch =
    message.match(
      /retry in ([\d.]+)\s*s/i
    ) ||
    message.match(
      /retryDelay"\s*:\s*"([\d.]+)s/i
    );

  if (retryMatch) {
    const seconds =
      parseFloat(retryMatch[1]);

    if (
      Number.isFinite(seconds) &&
      seconds > 0
    ) {
      waitHint = ` Please try again in about ${Math.max(1, Math.ceil(seconds / 60))} minute(s).`;
    }
  }

  return `Gemini API rate limit hit.${waitHint}`;
}

/* =========================================================
   WAIT
========================================================= */

function wait(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* =========================================================
   GENERATE GEMINI CONTENT
========================================================= */

export async function generateGeminiContent(
  prompt: string,
  images: GeminiImagePart[] = []
): Promise<string> {
  ensureGeminiKey();

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const maxAttempts = 3;

  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `[Gemini] Request ${attempt}/${maxAttempts}`
      );

      const response =
        await ai.models.generateContent({
          model: GEMINI_MODEL,

          contents: [
            {
              role: "user",

              parts: [
                {
                  text: prompt,
                },

                ...images,
              ],
            },
          ],

          config: {
            temperature: 0.3,

            responseMimeType:
              "application/json",
          },
        });

      const text =
        response.text?.trim() || "";

      if (!text) {
        throw new Error(
          "Gemini returned an empty response."
        );
      }

      console.log(
        "[Gemini] Response received successfully."
      );

      return text;
    } catch (error) {
      lastError = error;

      console.error(
        `[Gemini] Attempt ${attempt} failed:`,
        error
      );

      if (
        !isTemporaryGeminiError(error) ||
        attempt === maxAttempts
      ) {
        break;
      }

      const delay =
        2000 *
        Math.pow(2, attempt - 1);

      console.log(
        `[Gemini] Retrying in ${
          delay / 1000
        } seconds...`
      );

      await wait(delay);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : String(lastError);

  throw new Error(
    `Gemini API failed after ${maxAttempts} attempts: ${message}`
  );
}