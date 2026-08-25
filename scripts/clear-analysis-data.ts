/**
 * DEVELOPMENT-ONLY database reset script.
 *
 * Clears all OptiUX-AI analysis data from the database.
 * Does NOT drop tables, alter schema, or delete the database.
 *
 * Safety: requires BOTH
 *   1. ALLOW_DB_RESET=true environment variable
 *   2. Interactive "RESET" confirmation
 *
 * Usage:
 *   ALLOW_DB_RESET=true npx tsx scripts/clear-analysis-data.ts
 *   — or —
 *   npm run db:clear
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as readline from "node:readline";

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  /* ---- Safety gate 1: env var ---- */

  if (process.env.ALLOW_DB_RESET !== "true") {
    console.error(
      "\n❌ Refusing to run: set ALLOW_DB_RESET=true to enable this command.\n"
    );
    process.exit(1);
  }

  /* ---- Safety gate 2: confirm database target ---- */

  const dbUrl = process.env.DATABASE_URL || "";
  const dbMatch = dbUrl.match(/\/([^/?]+)\?/);
  const dbName = dbMatch?.[1] || "unknown";

  if (!dbUrl) {
    console.error(
      "\n❌ DATABASE_URL is not set. Cannot determine which database to clear.\n"
    );
    process.exit(1);
  }

  console.log(`\n🗄️  Target database: ${dbName}`);
  console.log(`   Host: ${dbUrl.match(/@([^:/]+)/)?.[1] || "unknown"}`);

  /* ---- Connect ---- */

  const adapter = new PrismaPg({ connectionString: dbUrl });
  const db = new PrismaClient({ adapter });

  /* ---- Count current records ---- */

  const counts = await Promise.all([
    db.analysis.count(),
    db.categoryScore.count(),
    db.strength.count(),
    db.issue.count(),
    db.recommendation.count(),
    db.replayEvent.count(),
  ]);

  const [
    analysisCount,
    categoryScoreCount,
    strengthCount,
    issueCount,
    recommendationCount,
    replayEventCount,
  ] = counts;

  const total =
    analysisCount +
    categoryScoreCount +
    strengthCount +
    issueCount +
    recommendationCount +
    replayEventCount;

  console.log(
    `\nFound ${analysisCount} analysis record(s) and ${total} total related records:`
  );
  console.log(`  Analysis:       ${analysisCount}`);
  console.log(`  CategoryScore:  ${categoryScoreCount}`);
  console.log(`  Strength:       ${strengthCount}`);
  console.log(`  Issue:          ${issueCount}`);
  console.log(`  Recommendation: ${recommendationCount}`);
  console.log(`  ReplayEvent:    ${replayEventCount}`);

  if (analysisCount === 0) {
    console.log("\n✅ Database is already empty. Nothing to do.\n");
    await db.$disconnect();
    process.exit(0);
  }

  /* ---- Safety gate 3: interactive confirmation ---- */

  console.log(
    "\n⚠️  Are you sure you want to delete ALL OptiUX-AI analysis data?"
  );
  console.log("   This cannot be undone.\n");

  const answer = await askQuestion('Type "RESET" to continue: ');

  if (answer !== "RESET") {
    console.log("\n❌ Cancelled. No data was deleted.\n");
    await db.$disconnect();
    process.exit(0);
  }

  /* ---- Delete all records ---- */

  console.log("\n🗑️  Deleting all analysis data...\n");

  // Delete in order from child to parent (defensive, even though cascade handles it).
  await db.replayEvent.deleteMany();
  await db.recommendation.deleteMany();
  await db.issue.deleteMany();
  await db.strength.deleteMany();
  await db.categoryScore.deleteMany();
  await db.analysis.deleteMany();

  /* ---- Verify ---- */

  const verify = await Promise.all([
    db.analysis.count(),
    db.categoryScore.count(),
    db.strength.count(),
    db.issue.count(),
    db.recommendation.count(),
    db.replayEvent.count(),
  ]);

  const [
    vAnalysis,
    vCategoryScore,
    vStrength,
    vIssue,
    vRecommendation,
    vReplayEvent,
  ] = verify;

  console.log("✅ Database reset complete.\n");
  console.log(`   Analysis:       ${vAnalysis}`);
  console.log(`   CategoryScore:  ${vCategoryScore}`);
  console.log(`   Strength:       ${vStrength}`);
  console.log(`   Issue:          ${vIssue}`);
  console.log(`   Recommendation: ${vRecommendation}`);
  console.log(`   ReplayEvent:    ${vReplayEvent}\n`);

  const allZero =
    vAnalysis +
      vCategoryScore +
      vStrength +
      vIssue +
      vRecommendation +
      vReplayEvent ===
    0;

  if (!allZero) {
    console.error(
      "⚠️  Warning: some records remain after deletion. Check cascade relations.\n"
    );
    await db.$disconnect();
    process.exit(1);
  }

  await db.$disconnect();
}

main();
