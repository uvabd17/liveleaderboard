-- Migration: add durationSeconds to RoundCompletion

ALTER TABLE "RoundCompletion" ADD COLUMN "durationSeconds" INTEGER;

-- Nothing else required; NULL allowed by default.
