-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "baptismYear" INTEGER,
ADD COLUMN     "baptized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousChurch" TEXT,
ADD COLUMN     "servingDepartment" TEXT;
