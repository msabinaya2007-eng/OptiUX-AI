import type { UXAnalysisResult, UXIssue, UXRecommendation } from "@/types";

export function validateAnalysisResult(data: unknown): data is UXAnalysisResult {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.overallScore !== "number") return false;
  if (typeof obj.summary !== "string") return false;

  if (typeof obj.categories !== "object" || obj.categories === null) return false;
  const cats = obj.categories as Record<string, unknown>;
  const requiredCats = [
    "accessibility",
    "usability",
    "visualHierarchy",
    "interactionCost",
    "cognitiveLoad",
  ];
  for (const cat of requiredCats) {
    if (typeof cats[cat] !== "number") return false;
  }

  if (!Array.isArray(obj.strengths)) return false;
  if (!Array.isArray(obj.issues)) return false;
  if (!Array.isArray(obj.recommendations)) return false;

  for (const issue of obj.issues) {
    if (!validateIssue(issue)) return false;
  }

  for (const rec of obj.recommendations) {
    if (!validateRecommendation(rec)) return false;
  }

  return true;
}

function validateIssue(data: unknown): data is UXIssue {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.category === "string" &&
    typeof obj.severity === "string" &&
    ["critical", "high", "medium", "low"].includes(obj.severity as string) &&
    typeof obj.description === "string" &&
    typeof obj.evidence === "string" &&
    typeof obj.recommendation === "string"
  );
}

function validateRecommendation(data: unknown): data is UXRecommendation {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.impact === "string" &&
    ["High", "Medium", "Low"].includes(obj.impact as string) &&
    typeof obj.description === "string"
  );
}
