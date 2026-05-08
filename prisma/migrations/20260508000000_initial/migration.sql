-- CreateEnum
CREATE TYPE "HostPlan" AS ENUM ('FREE', 'HOST', 'HOST_PLUS', 'PRO');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('MANUAL', 'AIRBNB', 'BOOKING', 'VRBO', 'DIRECT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuestSex" AS ENUM ('M', 'F', 'X');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'ID_CARD', 'DRIVING_LICENSE', 'RESIDENCE_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentSide" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "EmbeddingSource" AS ENUM ('SELFIE', 'DOCUMENT_PHOTO');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "Host" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "vatNumber" TEXT,
    "taxCode" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" "HostPlan" NOT NULL DEFAULT 'FREE',
    "planRenewsAt" TIMESTAMP(3),
    "alloggiatiUser" TEXT,
    "alloggiatiHashed" TEXT,
    "acceptedTermsAt" TIMESTAMP(3),
    "acceptedDpiaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "cin" TEXT,
    "alloggiatiCode" TEXT,
    "checkInTime" TEXT NOT NULL DEFAULT '15:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '10:00',
    "wifiName" TEXT,
    "wifiPassword" TEXT,
    "guideMarkdown" TEXT,
    "icalUrls" JSONB,
    "icalLastSync" TIMESTAMP(3),
    "taxPerPersonNight" DECIMAL(6,2),
    "taxMaxNights" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalRef" TEXT,
    "source" "BookingSource" NOT NULL DEFAULT 'MANUAL',
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "numGuests" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "leadName" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "checkInToken" TEXT NOT NULL,
    "checkInTokenExp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "birthCountry" TEXT,
    "nationality" TEXT,
    "sex" "GuestSex",
    "docType" "DocumentType",
    "docNumber" TEXT,
    "docIssuingCountry" TEXT,
    "docIssuedAt" TIMESTAMP(3),
    "docExpiresAt" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "matchScore" DOUBLE PRECISION,
    "livenessPassed" BOOLEAN NOT NULL DEFAULT false,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "side" "DocumentSide" NOT NULL DEFAULT 'FRONT',
    "ocrText" TEXT,
    "mrzRaw" TEXT,
    "parsedJson" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceEmbedding" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "source" "EmbeddingSource" NOT NULL DEFAULT 'SELFIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDeleteAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "alloggiatiCsv" TEXT,
    "alloggiatiSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "alloggiatiSubmittedAt" TIMESTAMP(3),
    "taxAmount" DECIMAL(8,2),
    "notes" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'it',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "hostId" TEXT,
    "guestId" TEXT,
    "bookingId" TEXT,
    "event" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Host_email_key" ON "Host"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Host_stripeCustomerId_key" ON "Host"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Host_stripeSubscriptionId_key" ON "Host"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Session_hostId_idx" ON "Session"("hostId");

-- CreateIndex
CREATE INDEX "Property_hostId_idx" ON "Property"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_checkInToken_key" ON "Booking"("checkInToken");

-- CreateIndex
CREATE INDEX "Booking_propertyId_idx" ON "Booking"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_checkInToken_idx" ON "Booking"("checkInToken");

-- CreateIndex
CREATE INDEX "Guest_bookingId_idx" ON "Guest"("bookingId");

-- CreateIndex
CREATE INDEX "Document_guestId_idx" ON "Document"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceEmbedding_guestId_key" ON "FaceEmbedding"("guestId");

-- CreateIndex
CREATE INDEX "FaceEmbedding_scheduledDeleteAt_idx" ON "FaceEmbedding"("scheduledDeleteAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_bookingId_key" ON "CheckIn"("bookingId");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_propertyId_idx" ON "KnowledgeChunk"("propertyId");

-- CreateIndex
CREATE INDEX "AuditLog_hostId_idx" ON "AuditLog"("hostId");

-- CreateIndex
CREATE INDEX "AuditLog_guestId_idx" ON "AuditLog"("guestId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceEmbedding" ADD CONSTRAINT "FaceEmbedding_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
