-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'CREDIT');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'CASH';
