-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LOAN', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'CHECKING',
    "startingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "goal" DECIMAL(12,2),
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userProfileId_idx" ON "Account"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userProfileId_name_key" ON "Account"("userProfileId", "name");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
