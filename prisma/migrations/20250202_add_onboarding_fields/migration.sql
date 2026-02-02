-- Migration: add_onboarding_fields
-- Add onboardingComplete and accountType fields to User table

-- Add onboardingComplete field (default false for existing users)
ALTER TABLE "User" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- Add accountType field (nullable for existing users)
ALTER TABLE "User" ADD COLUMN "accountType" TEXT;

-- Update existing users with orgId to mark onboarding as complete
UPDATE "User" SET "onboardingComplete" = true WHERE "orgId" IS NOT NULL;
