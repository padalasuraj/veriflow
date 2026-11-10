ALTER TABLE "User" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "demoGroupId" TEXT;
ALTER TABLE "User" ADD COLUMN "demoExpiresAt" DATETIME;

CREATE INDEX "User_isDemo_demoExpiresAt_idx" ON "User"("isDemo", "demoExpiresAt");
CREATE INDEX "User_demoGroupId_role_idx" ON "User"("demoGroupId", "role");
