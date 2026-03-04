/*
  Warnings:

  - You are about to drop the column `birthYear` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "birthYear",
ADD COLUMN     "birthDate" TEXT;
