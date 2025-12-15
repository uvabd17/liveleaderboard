-- Migration: Add performance indexes for production scale

-- Add composite indexes for Score model
CREATE INDEX IF NOT EXISTS "Score_eventId_participantId_idx" ON "Score"("eventId", "participantId");
CREATE INDEX IF NOT EXISTS "Score_eventId_criterion_idx" ON "Score"("eventId", "criterion");
CREATE INDEX IF NOT EXISTS "Score_eventId_judgeUserId_idx" ON "Score"("eventId", "judgeUserId");

-- Add composite indexes for RoundCompletion model
CREATE INDEX IF NOT EXISTS "RoundCompletion_eventId_participantId_roundNumber_idx" ON "RoundCompletion"("eventId", "participantId", "roundNumber");
CREATE INDEX IF NOT EXISTS "RoundCompletion_eventId_completedAt_idx" ON "RoundCompletion"("eventId", "completedAt");

-- Add composite index for Event model
CREATE INDEX IF NOT EXISTS "Event_orgId_slug_idx" ON "Event"("orgId", "slug");

-- Add index for Participant model
CREATE INDEX IF NOT EXISTS "Participant_eventId_idx" ON "Participant"("eventId");

-- Note: For PostgreSQL JSON field indexing (profile->>'accessToken'), we need a GIN index
-- This requires the participant profile to be JSONB, but Prisma uses Json type which maps to JSON
-- For now, we'll rely on application-level filtering, but this can be optimized later with a separate token table

