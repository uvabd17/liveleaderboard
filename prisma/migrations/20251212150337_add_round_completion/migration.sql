/*
  Warnings:

  - A unique constraint covering the columns `[eventId,normalizedName,kind]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedName` to the `Participant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "brandColors" JSONB,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "normalizedName" TEXT NOT NULL;
-- CreateTable
CREATE TABLE "JudgeInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "singleUse" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "usesLeft" INTEGER,
    "singleUse" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "registrationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JudgeInvite_token_key" ON "JudgeInvite"("token");

-- CreateIndex
CREATE INDEX "JudgeInvite_eventId_idx" ON "JudgeInvite"("eventId");

-- CreateIndex
CREATE INDEX "JudgeInvite_token_idx" ON "JudgeInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationToken_token_key" ON "RegistrationToken"("token");

-- CreateIndex
CREATE INDEX "RegistrationToken_eventId_idx" ON "RegistrationToken"("eventId");

-- CreateIndex
CREATE INDEX "RegistrationToken_token_idx" ON "RegistrationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_normalizedName_kind_key" ON "Participant"("eventId", "normalizedName", "kind");

-- AddForeignKey
ALTER TABLE "JudgeInvite" ADD CONSTRAINT "JudgeInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeInvite" ADD CONSTRAINT "JudgeInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeInvite" ADD CONSTRAINT "JudgeInvite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationToken" ADD CONSTRAINT "RegistrationToken_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationToken" ADD CONSTRAINT "RegistrationToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: RoundCompletion-related foreign keys and index renames are handled in the dedicated RoundCompletion migration file.
