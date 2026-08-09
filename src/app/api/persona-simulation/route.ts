import type { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use the same Gemini model that is working for your UX analysis.
const GEMINI_MODEL = "gemini-3.5-flash";

const PERSONAS = {
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

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return Response.json(
        { error: "AI API key is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();

    const { persona, result } = body;

    if (!persona || !PERSONAS[persona as keyof typeof PERSONAS]) {
      return Response.json(
        { error: "Invalid persona selected." },
        { status: 400 }
      );
    }

    if (!result) {
      return Response.json(
        { error: "UX analysis result is required." },
        { status: 400 }
      );
    }

    const selectedPersona =
      PERSONAS[persona as keyof typeof PERSONAS];

    const userPrompt = `
Selected Persona:
${selectedPersona.name}

Persona Characteristics:
${selectedPersona.description}

UX Analysis:

Overall Score:
${result.overallScore}

Summary:
${result.summary}

Categories:
${JSON.stringify(result.categories)}

Strengths:
${JSON.stringify(result.strengths)}

UX Issues:
${JSON.stringify(result.issues)}

Recommendations:
${JSON.stringify(result.recommendations)}

Perform a persona simulation for the selected user.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT + "\n\n" + userPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Gemini API error (${response.status}): ${error.slice(0, 300)}`
      );
    }

    const data = await response.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const simulation = JSON.parse(text);

    return Response.json({
      simulation,
    });
  } catch (error) {
    console.error("Persona simulation error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Persona simulation failed.",
      },
      { status: 500 }
    );
  }
}