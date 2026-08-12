-- CreateEnum
CREATE TYPE "RankedRoundStatus" AS ENUM ('ACTIVE', 'CORRECT', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RankedRound" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "mode" "RankedMode" NOT NULL,
    "tokenJti" TEXT NOT NULL,
    "status" "RankedRoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "wrongAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "targetPokemonId" INTEGER NOT NULL,
    "guessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankedRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankedRound_tokenJti_key" ON "RankedRound"("tokenJti");

-- CreateIndex
CREATE INDEX "RankedRound_matchId_roundIndex_idx" ON "RankedRound"("matchId", "roundIndex");

-- CreateIndex
CREATE INDEX "RankedRound_matchId_status_idx" ON "RankedRound"("matchId", "status");

-- CreateIndex
CREATE INDEX "RankedRound_matchId_updatedAt_idx" ON "RankedRound"("matchId", "updatedAt");

-- AddForeignKey
ALTER TABLE "RankedRound" ADD CONSTRAINT "RankedRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "RankedMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ConsumedGameJti" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumedGameJti_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "ConsumedGameJti_expiresAt_idx" ON "ConsumedGameJti"("expiresAt");
