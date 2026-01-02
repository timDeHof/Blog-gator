-- Migration to convert is_admin column from text to boolean
-- This is a breaking schema change that requires data conversion

-- Step 1: Create a temporary column to store the converted boolean values
ALTER TABLE "users" ADD COLUMN "is_admin_temp" boolean;
--> statement-breakpoint

-- Step 2: Convert existing text values to boolean
-- Handle "true"/"false" (case-insensitive), NULL, and unexpected values
UPDATE "users" SET "is_admin_temp" =
  CASE
    WHEN "is_admin" IS NULL THEN false
    WHEN LOWER(TRIM("is_admin")) IN ('true', '1', 'yes', 'y', 'on') THEN true
    WHEN LOWER(TRIM("is_admin")) IN ('false', '0', 'no', 'n', 'off') THEN false
    ELSE false -- Default to false for any unexpected values
  END;
--> statement-breakpoint

-- Step 3: Drop the old text column
ALTER TABLE "users" DROP COLUMN "is_admin";
--> statement-breakpoint

-- Step 4: Rename the temporary column to the original name with proper constraints
ALTER TABLE "users" RENAME COLUMN "is_admin_temp" TO "is_admin";
--> statement-breakpoint

-- Step 5: Add NOT NULL constraint and default value
ALTER TABLE "users" ALTER COLUMN "is_admin" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" SET DEFAULT false;
--> statement-breakpoint

-- DOWN MIGRATION: Revert is_admin column from boolean back to text
-- Step 1: Create a temporary text column
ALTER TABLE "users" ADD COLUMN "is_admin_temp" text;
--> statement-breakpoint

-- Step 2: Convert boolean values back to text representation
UPDATE "users" SET "is_admin_temp" =
  CASE
    WHEN "is_admin" = true THEN 'true'
    WHEN "is_admin" = false THEN 'false'
    ELSE 'false' -- Default to 'false' for any unexpected values
  END;
--> statement-breakpoint

-- Step 3: Drop the boolean column
ALTER TABLE "users" DROP COLUMN "is_admin";
--> statement-breakpoint

-- Step 4: Rename the temporary text column back to the original name
ALTER TABLE "users" RENAME COLUMN "is_admin_temp" TO "is_admin";
--> statement-breakpoint
