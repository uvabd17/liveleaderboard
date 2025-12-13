-- Migration: add_round_completion

-- Create table for per-participant per-round completion timestamps
CREATE TABLE "RoundCompletion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "judgeUserId" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- Foreign key relations
ALTER TABLE "RoundCompletion" ADD CONSTRAINT "RoundCompletion_event_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE;
ALTER TABLE "RoundCompletion" ADD CONSTRAINT "RoundCompletion_participant_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "RoundCompletion_event_round_idx" ON "RoundCompletion" ("eventId", "roundNumber");

-- Unique constraint to prevent duplicates per event/participant/round
CREATE UNIQUE INDEX "RoundCompletion_event_participant_round_unique" ON "RoundCompletion" ("eventId", "participantId", "roundNumber");
