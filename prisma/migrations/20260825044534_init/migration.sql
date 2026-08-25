-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "url" TEXT,
    "projectName" TEXT,
    "targetAudience" TEXT,
    "productDescription" TEXT,
    "uxGoals" TEXT,
    "overallScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryScore" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "accessibility" INTEGER NOT NULL,
    "usability" INTEGER NOT NULL,
    "visualHierarchy" INTEGER NOT NULL,
    "interactionCost" INTEGER NOT NULL,
    "cognitiveLoad" INTEGER NOT NULL,

    CONSTRAINT "CategoryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strength" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Strength_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplayEvent" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "severity" TEXT,

    CONSTRAINT "ReplayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryScore_analysisId_key" ON "CategoryScore"("analysisId");

-- CreateIndex
CREATE INDEX "Strength_analysisId_idx" ON "Strength"("analysisId");

-- CreateIndex
CREATE INDEX "Issue_analysisId_idx" ON "Issue"("analysisId");

-- CreateIndex
CREATE INDEX "Recommendation_analysisId_idx" ON "Recommendation"("analysisId");

-- CreateIndex
CREATE INDEX "ReplayEvent_analysisId_idx" ON "ReplayEvent"("analysisId");

-- AddForeignKey
ALTER TABLE "CategoryScore" ADD CONSTRAINT "CategoryScore_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strength" ADD CONSTRAINT "Strength_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplayEvent" ADD CONSTRAINT "ReplayEvent_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
