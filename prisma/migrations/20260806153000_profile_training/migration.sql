-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "enabledModes";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "region";
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "receiveRankedUpdates";

ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "pseudo" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "publicId" CHAR(6);

-- Backfill existing rows before NOT NULL
UPDATE "UserProfile" AS up
SET
  "publicId" = upper(substr(md5(random()::text || up."id"), 1, 6)),
  "pseudo" = COALESCE(
    NULLIF(trim((SELECT u."name" FROM "User" u WHERE u."id" = up."userId")), ''),
    'Dresseur' || upper(substr(md5(up."id"), 1, 4))
  )
WHERE up."publicId" IS NULL OR up."pseudo" IS NULL;

-- Ensure uniqueness of backfilled publicIds (retry collisions simply by appending random)
-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingPokemon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPokemon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPokemon_userId_pokemonId_key" ON "TrainingPokemon"("userId", "pokemonId");
CREATE INDEX IF NOT EXISTS "TrainingPokemon_userId_idx" ON "TrainingPokemon"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TrainingPokemon_userId_fkey'
  ) THEN
    ALTER TABLE "TrainingPokemon"
      ADD CONSTRAINT "TrainingPokemon_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_publicId_key" ON "UserProfile"("publicId");
CREATE INDEX IF NOT EXISTS "UserProfile_pseudo_idx" ON "UserProfile"("pseudo");

ALTER TABLE "UserProfile" ALTER COLUMN "pseudo" SET NOT NULL;
ALTER TABLE "UserProfile" ALTER COLUMN "publicId" SET NOT NULL;
