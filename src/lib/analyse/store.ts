import { getDb } from "@/lib/db/prisma";
import type { AnalysisInputType, UXAnalysisResult } from "@/types";

interface SaveAnalysisParams {
  inputType: AnalysisInputType;
  url?: string;
  context?: {
    projectName?: string;
    targetAudience?: string;
    productDescription?: string;
    uxGoals?: string;
  };
  result: UXAnalysisResult;
  rawJson?: unknown;
}

export async function saveAnalysis(params: SaveAnalysisParams): Promise<string> {
  const db = getDb();
  const { inputType, url, context, result, rawJson } = params;

  const analysis = await db.analysis.create({
    data: {
      inputType,
      url: url ?? null,
      projectName: context?.projectName ?? null,
      targetAudience: context?.targetAudience ?? null,
      productDescription: context?.productDescription ?? null,
      uxGoals: context?.uxGoals ?? null,
      overallScore: result.overallScore,
      summary: result.summary,
      rawJson: rawJson ?? undefined,

      categories: {
        create: {
          accessibility: result.categories.accessibility,
          usability: result.categories.usability,
          visualHierarchy: result.categories.visualHierarchy,
          interactionCost: result.categories.interactionCost,
          cognitiveLoad: result.categories.cognitiveLoad,
        },
      },

      strengths: {
        create: result.strengths.map((text) => ({ text })),
      },

      issues: {
        create: result.issues.map((issue) => ({
          title: issue.title,
          category: issue.category,
          severity: issue.severity,
          description: issue.description,
          evidence: issue.evidence,
          recommendation: issue.recommendation,
        })),
      },

      recommendations: {
        create: result.recommendations.map((rec) => ({
          title: rec.title,
          impact: rec.impact,
          description: rec.description,
        })),
      },

      replayTimeline: {
        create: (result.replayTimeline ?? []).map((event) => ({
          timestamp: event.timestamp,
          event: event.event,
          status: event.status,
          observation: event.observation,
          severity: event.severity ?? null,
        })),
      },
    },
  });

  return analysis.id;
}

export async function listAnalyses(limit = 20) {
  const db = getDb();

  return db.analysis.findMany({
    select: {
      id: true,
      inputType: true,
      url: true,
      projectName: true,
      overallScore: true,
      summary: true,
      createdAt: true,
      categories: {
        select: {
          accessibility: true,
          usability: true,
          visualHierarchy: true,
          interactionCost: true,
          cognitiveLoad: true,
        },
      },
      _count: {
        select: {
          issues: true,
          strengths: true,
          recommendations: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAnalysisById(id: string) {
  const db = getDb();

  return db.analysis.findUnique({
    where: { id },
    include: {
      categories: true,
      strengths: true,
      issues: true,
      recommendations: true,
      replayTimeline: true,
    },
  });
}

export async function deleteAnalysis(id: string): Promise<boolean> {
  const db = getDb();

  try {
    await db.analysis.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteAllAnalyses(): Promise<number> {
  const db = getDb();
  const result = await db.analysis.deleteMany();
  return result.count;
}

export async function countAnalyses(): Promise<number> {
  const db = getDb();
  return db.analysis.count();
}
