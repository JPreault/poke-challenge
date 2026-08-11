-- CreateEnum
CREATE TYPE "RankedEndReason" AS ENUM ('COMPLETED_FAIL', 'ABANDONED');

-- AlterTable RankedMatch
ALTER TABLE "RankedMatch" ADD COLUMN "winStreak" INTEGER;
ALTER TABLE "RankedMatch" ADD COLUMN "endedReason" "RankedEndReason";
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "score";
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "accuracy";
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "ratingBefore";
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "ratingAfter";
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "deltaRating";

-- AlterTable LeaderboardEntry
ALTER TABLE "LeaderboardEntry" ADD COLUMN "bestWinStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeaderboardEntry" DROP COLUMN IF EXISTS "rating";
ALTER TABLE "LeaderboardEntry" DROP COLUMN IF EXISTS "winsCount";
ALTER TABLE "LeaderboardEntry" DROP COLUMN IF EXISTS "lossesCount";

-- DropIndex
DROP INDEX IF EXISTS "LeaderboardEntry_seasonId_mode_rating_idx";

-- CreateIndex
CREATE INDEX "LeaderboardEntry_seasonId_mode_bestWinStreak_idx" ON "LeaderboardEntry"("seasonId", "mode", "bestWinStreak");
