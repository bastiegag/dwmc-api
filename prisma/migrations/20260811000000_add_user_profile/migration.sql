-- Rename the existing application currency preference without changing its values.
ALTER TABLE "UserProfile" RENAME COLUMN "currency" TO "preferredCurrency";
ALTER TABLE "UserProfile" ADD COLUMN "displayName" TEXT;
