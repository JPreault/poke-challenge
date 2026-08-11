-- Dedupe leaderboard rows before removing season scope
DELETE FROM "LeaderboardEntry"
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "userId", mode
        ORDER BY "bestWinStreak" DESC, "updatedAt" ASC
      ) AS row_num
    FROM "LeaderboardEntry"
  ) ranked
  WHERE row_num > 1
);

-- Drop foreign keys
ALTER TABLE "RankedMatch" DROP CONSTRAINT IF EXISTS "RankedMatch_seasonId_fkey";
ALTER TABLE "LeaderboardEntry" DROP CONSTRAINT IF EXISTS "LeaderboardEntry_seasonId_fkey";
ALTER TABLE "RatingHistory" DROP CONSTRAINT IF EXISTS "RatingHistory_seasonId_fkey";

-- Drop season-related indexes
DROP INDEX IF EXISTS "RankedMatch_seasonId_mode_createdAt_idx";
DROP INDEX IF EXISTS "LeaderboardEntry_userId_seasonId_mode_key";
DROP INDEX IF EXISTS "LeaderboardEntry_seasonId_mode_bestWinStreak_idx";
DROP INDEX IF EXISTS "RatingHistory_userId_seasonId_mode_createdAt_idx";

-- Drop season columns
ALTER TABLE "RankedMatch" DROP COLUMN IF EXISTS "seasonId";
ALTER TABLE "LeaderboardEntry" DROP COLUMN IF EXISTS "seasonId";
ALTER TABLE "RatingHistory" DROP COLUMN IF EXISTS "seasonId";

-- Drop season table
DROP TABLE IF EXISTS "Season";

-- Recreate indexes without season
CREATE INDEX "RankedMatch_mode_createdAt_idx" ON "RankedMatch"("mode", "createdAt");
CREATE UNIQUE INDEX "LeaderboardEntry_userId_mode_key" ON "LeaderboardEntry"("userId", "mode");
CREATE INDEX "LeaderboardEntry_mode_bestWinStreak_idx" ON "LeaderboardEntry"("mode", "bestWinStreak");
CREATE INDEX "RatingHistory_userId_mode_createdAt_idx" ON "RatingHistory"("userId", "mode", "createdAt");
