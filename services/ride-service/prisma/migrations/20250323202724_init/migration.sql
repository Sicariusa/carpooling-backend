-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "driverId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure" TIMESTAMP(3) NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isGirlsOnly" BOOLEAN NOT NULL DEFAULT false,
    "status" "RideStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFromGIU" BOOLEAN NOT NULL DEFAULT false,
    "isToGIU" BOOLEAN NOT NULL DEFAULT false,
    "bookingDeadline" TIMESTAMP(3),
    "street" TEXT,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ride_origin_destination_idx" ON "Ride"("origin", "destination");

-- CreateIndex
CREATE INDEX "Ride_isFromGIU_isToGIU_idx" ON "Ride"("isFromGIU", "isToGIU");
