UPDATE "User" SET "demoExpiresAt" = NULL WHERE "isDemo" = true;
UPDATE "Session"
SET "expiresAt" = datetime('now', '+100 years')
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "isDemo" = true);

DROP INDEX "User_isDemo_demoExpiresAt_idx";
ALTER TABLE "User" DROP COLUMN "demoExpiresAt";
