-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "volunteerStatus" "VolunteerStatus" NOT NULL DEFAULT 'NONE';
