import { listAnalyses, deleteAllAnalyses } from "@/lib/analyse/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const analyses = await listAnalyses(20);

    return Response.json(analyses, { status: 200 });
  } catch (error) {
    console.error(
      "[OptiUX] Failed to fetch analyses:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to retrieve analysis history.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const count = await deleteAllAnalyses();

    console.log(
      `[OptiUX] Deleted ${count} analysis record(s) via API.`
    );

    return Response.json(
      { success: true, deleted: count },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[OptiUX] Failed to delete analyses:",
      error
    );

    return Response.json(
      { error: "Failed to delete analyses." },
      { status: 500 }
    );
  }
}
