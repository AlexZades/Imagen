-- Add credits system columns to User
ALTER TABLE "User" ADD COLUMN "credits_free" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "credits_free_last_grant_at" TIMESTAMP(3);
