/*
  Warnings:

  - Added the required column `updatedAt` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
