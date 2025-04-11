/*
  Warnings:

  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- DropIndex
DROP INDEX "Payment_bookingId_key";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'egp',
ADD COLUMN     "paymentIntentId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE INTEGER,
ALTER COLUMN "status" SET DEFAULT 'pending';
