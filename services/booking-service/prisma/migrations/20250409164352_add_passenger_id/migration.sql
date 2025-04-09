/*
  Warnings:

  - The required column `passengerId` was added to the `Booking` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "passengerId" TEXT NOT NULL;
