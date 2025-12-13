-- Step 1: Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add ownerId to Organization (nullable first)
ALTER TABLE "Organization" ADD COLUMN "ownerId" TEXT;

-- Step 3: Create a default user for existing organizations
DO $$
DECLARE
    org_record RECORD;
    new_user_id TEXT;
BEGIN
    FOR org_record IN SELECT id, name, slug FROM "Organization"
    LOOP
        -- Generate user ID
        new_user_id := 'default_' || org_record.id;
        
        -- Create default user with temporary password (user should change this)
        INSERT INTO "User" ("id", "email", "name", "password", "createdAt", "updatedAt")
        VALUES (
            new_user_id,
            'admin@' || org_record.slug || '.local',
            org_record.name || ' Admin',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aqON9nF7MSXK', -- bcrypt hash of "changeme123"
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        -- Update organization with ownerId
        UPDATE "Organization" SET "ownerId" = new_user_id WHERE id = org_record.id;
        
        -- Link user to organization
        UPDATE "User" SET "orgId" = org_record.id WHERE id = new_user_id;
    END LOOP;
END $$;

-- Step 4: Make ownerId required
ALTER TABLE "Organization" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 5: Add Event fields
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

-- Step 6: Create indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Event_slug_idx" ON "Event"("slug");
CREATE INDEX "Event_orgId_idx" ON "Event"("orgId");
CREATE INDEX "Event_visibility_idx" ON "Event"("visibility");

-- Step 7: Add foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" 
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" 
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
