import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import {
  getAnalysisById,
  deleteAnalysis,
} from "@/lib/analyse/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: "Analysis ID is required." },
      { status: 400 }
    );
  }

  try {
    const analysis = await getAnalysisById(id);

    if (!analysis) {
      return Response.json(
        { error: "Analysis not found." },
        { status: 404 }
      );
    }

    return Response.json(analysis, { status: 200 });
  } catch (error) {
    console.error(
      "[OptiUX] Failed to fetch analysis:",
      error
    );

    return Response.json(
      { error: "Failed to retrieve analysis." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: "Analysis ID is required." },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteAnalysis(id);

    if (!deleted) {
      return Response.json(
        { error: "Analysis not found." },
        { status: 404 }
      );
    }

    return Response.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[OptiUX] Failed to delete analysis:",
      error
    );

    return Response.json(
      { error: "Failed to delete analysis." },
      { status: 500 }
    );
  }
}
