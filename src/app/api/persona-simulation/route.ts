import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash";

/* =======================================================
   TYPES
======================================================= */

type PersonaId =
  | "first-time"
  | "busy-professional"
  | "low-tech"
  | "accessibility";

type JourneyStatus =
  | "success"
  | "friction"
  | "error"
  | "neutral";

interface PersonaDefinition {
  name: string;
  description: string;
}

interface PersonaMap {
  "first-time": PersonaDefinition;
  "busy-professional": PersonaDefinition;
  "low-tech": PersonaDefinition;
  accessibility: PersonaDefinition;
}

interface UXIssueInput {
  id?: string;
  title?: string;
  category?: string;
  severity?: string;
  description?: string;
  evidence?: string;
  recommendation?: string;
}

interface UXRecommendationInput {
  title?: string;
  impact?: string;
  description?: string;
}

interface UXCategoriesInput {
  accessibility?: number;
  usability?: number;
  visualHierarchy?: number;
  interactionCost?: number;
  cognitiveLoad?: number;
}

interface UXAnalysisInput {
  overallScore?: number;
  summary?: string;
  categories?: UXCategoriesInput;
  strengths?: string[];
  issues?: UXIssueInput[];
  recommendations?: UXRecommendationInput[];
}

interface PersonaRequestBody {
  persona?: string;
  result?: UXAnalysisInput;
}

interface JourneyStep {
  step: string;
  status: JourneyStatus;
  observation: string;
}

interface PersonaSimulation {
  persona: string;
  personaName: string;
  goal: string;
  score: number;
  summary: string;
  journey: JourneyStep[];
  frictionPoints: string[];
  improvements: string[];
}

interface GeminiResponsePart {
  text?: string;
}

interface GeminiResponseContent {
  parts?: GeminiResponsePart[];
}

interface GeminiCandidate {
  content?: GeminiResponseContent;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/* =======================================================
   PERSONAS
======================================================= */

const PERSONAS: PersonaMap = {
  "first-time": {
    name: "First-Time User",
    description:
      "A user who has never used the product before. They need clear guidance, simple terminology, and obvious next steps.",
  },

  "busy-professional": {
    name: "Busy Professional",
    description:
      "A time-conscious professional who wants to complete tasks quickly with minimal clicks, distractions, and cognitive effort.",
  },

  "low-tech": {
    name: "Low-Tech User",
    description:
      "A user who is less comfortable with technology and needs simple navigation, familiar language, clear instructions, and forgiving interactions.",
  },

  accessibility: {
    name: "Accessibility-Focused User",
    description:
      "A user who depends on accessible design practices including strong contrast, clear hierarchy, readable text, keyboard-friendly interactions, and understandable controls.",
  },
};

/* =======================================================
   SYSTEM PROMPT
======================================================= */

const SYSTEM_PROMPT = `
You are an expert UX researcher performing a persona-based usability simulation.

You will receive:
1. A UX analysis of an interface
2. A selected user persona
3. The persona's goals and characteristics

Simulate how this specific persona would experience the interface.

Do NOT invent visual details that are not supported by the provided UX analysis.

Return ONLY valid JSON using this exact structure:

{
  "persona": "<persona id>",
  "personaName": "<persona name>",
  "goal": "<what this persona wants to accomplish>",
  "score": <number 0-100>,
  "summary": "<short summary of the persona's experience>",
  "journey": [
    {
      "step": "<step name>",
      "status": "<success|friction|error|neutral>",
      "observation": "<what the persona would experience>"
    }
  ],
  "frictionPoints": [
    "<friction point>"
  ],
  "improvements": [
    "<specific improvement>"
  ]
}

Rules:
- Base the simulation on the provided UX analysis.
- Do not claim the persona actually interacted with the website.
- This is a simulated UX perspective.
- Provide 3-6 journey steps.
- Provide at least 3 friction points.
- Provide at least 3 improvements.
- Score should reflect the persona's experience, not simply the overall UX score.
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
   CHECK TEMPORARY GEMINI ERROR
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
   CALL GEMINI
======================================================= */

async function callGemini(
  prompt: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "AI API key is not configured."
    );
  }

  const maxAttempts = 3;

  let lastError =
    "Gemini request failed.";

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      console.log(
        `Persona Gemini request ${attempt}/${maxAttempts}`
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
                    text: prompt,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0.4,
              responseMimeType:
                "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data =
          (await response.json()) as GeminiResponse;

        const text =
          data.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;

        if (!text) {
          throw new Error(
            "Gemini returned an empty response."
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
        "Persona Gemini request failed:",
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
        `Retrying in ${
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
        `Persona Gemini attempt ${attempt} failed:`,
        error
      );

      if (
        attempt === maxAttempts
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
    `Gemini API failed after ${maxAttempts} attempts: ${lastError}`
  );
}

/* =======================================================
   EXTRACT JSON
======================================================= */

function extractJson(
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
    // Try extracting JSON object below.
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
    const jsonText =
      cleaned.slice(
        start,
        end + 1
      );

    return JSON.parse(
      jsonText
    ) as unknown;
  }

  throw new Error(
    "Gemini returned invalid JSON."
  );
}

/* =======================================================
   TYPE GUARDS
======================================================= */

function isRecord(
  value: unknown
): value is Record<string, unknown> {
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

function isNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

/* =======================================================
   VALIDATE PERSONA SIMULATION
======================================================= */

function validateSimulation(
  value: unknown
): value is PersonaSimulation {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isString(value.persona) ||
    !isString(value.personaName) ||
    !isString(value.goal) ||
    !isNumber(value.score) ||
    !isString(value.summary)
  ) {
    return false;
  }

  if (
    value.score < 0 ||
    value.score > 100
  ) {
    return false;
  }

  if (!Array.isArray(value.journey)) {
    return false;
  }

  if (
    !Array.isArray(
      value.frictionPoints
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(
      value.improvements
    )
  ) {
    return false;
  }

  for (
    const journeyItem of value.journey
  ) {
    if (
      !isRecord(journeyItem) ||
      !isString(journeyItem.step) ||
      !isString(
        journeyItem.status
      ) ||
      !isString(
        journeyItem.observation
      )
    ) {
      return false;
    }

    const validStatuses: JourneyStatus[] = [
      "success",
      "friction",
      "error",
      "neutral",
    ];

    if (
      !validStatuses.includes(
        journeyItem.status as JourneyStatus
      )
    ) {
      return false;
    }
  }

  for (
    const frictionPoint of value.frictionPoints
  ) {
    if (!isString(frictionPoint)) {
      return false;
    }
  }

  for (
    const improvement of value.improvements
  ) {
    if (!isString(improvement)) {
      return false;
    }
  }

  return true;
}

/* =======================================================
   POST
======================================================= */

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    /* ===================================================
       API KEY
    =================================================== */

    if (!GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "AI API key is not configured.",
        },
        {
          status: 503,
        }
      );
    }

    /* ===================================================
       REQUEST BODY
    =================================================== */

    const body =
      (await request.json()) as PersonaRequestBody;

    const personaId =
      body.persona;

    const result =
      body.result;

    /* ===================================================
       VALIDATE PERSONA
    =================================================== */

    if (
      !personaId ||
      !Object.prototype.hasOwnProperty.call(
        PERSONAS,
        personaId
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid persona selected.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedPersona =
      PERSONAS[
        personaId as PersonaId
      ];

    /* ===================================================
       VALIDATE UX RESULT
    =================================================== */

    if (!result) {
      return Response.json(
        {
          error:
            "UX analysis result is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===================================================
       BUILD PROMPT
    =================================================== */

    const userPrompt = `
Selected Persona:
${selectedPersona.name}

Persona Characteristics:
${selectedPersona.description}

UX Analysis:

Overall Score:
${result.overallScore ?? "Not provided"}

Summary:
${result.summary ?? "Not provided"}

Categories:
${JSON.stringify(
  result.categories ?? {}
)}

Strengths:
${JSON.stringify(
  result.strengths ?? []
)}

UX Issues:
${JSON.stringify(
  result.issues ?? []
)}

Recommendations:
${JSON.stringify(
  result.recommendations ?? []
)}

Perform a persona simulation for the selected user.

Remember:
- This is a simulation.
- Do not claim the persona actually used the website.
- Base observations on the supplied UX analysis.
`;

    /* ===================================================
       GEMINI
    =================================================== */

    const rawText =
      await callGemini(
        SYSTEM_PROMPT +
          "\n\n" +
          userPrompt
      );

    /* ===================================================
       PARSE RESPONSE
    =================================================== */

    let parsedSimulation: unknown;

    try {
      parsedSimulation =
        extractJson(
          rawText
        );
    } catch (error: unknown) {
      console.error(
        "PERSONA JSON PARSE ERROR:",
        error
      );

      return Response.json(
        {
          error:
            "Gemini returned an invalid persona simulation response.",
        },
        {
          status: 502,
        }
      );
    }

    /* ===================================================
       VALIDATE RESPONSE
    =================================================== */

    if (
      !validateSimulation(
        parsedSimulation
      )
    ) {
      console.error(
        "INVALID PERSONA SIMULATION:",
        parsedSimulation
      );

      return Response.json(
        {
          error:
            "AI returned an invalid persona simulation.",
        },
        {
          status: 502,
        }
      );
    }

    const simulation: PersonaSimulation =
      parsedSimulation;

    /* ===================================================
       RETURN
    =================================================== */

    return Response.json(
      {
        simulation,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      "Persona simulation error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Persona simulation failed.",
      },
      {
        status: 500,
      }
    );
  }
}