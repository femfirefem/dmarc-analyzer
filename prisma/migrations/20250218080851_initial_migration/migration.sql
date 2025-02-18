-- CreateEnum
CREATE TYPE "AlignmentMode" AS ENUM ('r', 's');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('NONE', 'QUARANTINE', 'REJECT');

-- CreateEnum
CREATE TYPE "FailureReporting" AS ENUM ('0', '1', 'd', 's');

-- CreateEnum
CREATE TYPE "AuthResult" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "ReporterTrustLevel" AS ENUM ('UNTRUSTED', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReporterStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('DNS_TXT', 'EMAIL', 'FILE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "DmarcReport" (
    "id" TEXT NOT NULL,
    "mailDate" TIMESTAMP(3) NOT NULL,
    "processedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "orgEmail" TEXT,
    "beginDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "domain" TEXT NOT NULL,
    "adkim" "AlignmentMode",
    "aspf" "AlignmentMode",
    "policy" "PolicyType" NOT NULL,
    "subdomainPolicy" "PolicyType",
    "percentage" INTEGER,
    "failureReporting" "FailureReporting",
    "reporterId" TEXT,

    CONSTRAINT "DmarcReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "sourceIp" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "disposition" "PolicyType" NOT NULL,
    "dkim" "AuthResult" NOT NULL,
    "spf" "AuthResult" NOT NULL,
    "headerFrom" TEXT NOT NULL,
    "dkimDomain" TEXT,
    "dkimResult" "AuthResult",
    "dkimSelector" TEXT,
    "spfDomain" TEXT,
    "spfResult" "AuthResult",
    "reportId" TEXT NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnownReporter" (
    "id" TEXT NOT NULL,
    "orgEmail" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "submitter" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "trustLevel" "ReporterTrustLevel" NOT NULL DEFAULT 'UNTRUSTED',
    "status" "ReporterStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnownReporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "DomainOwnership" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "VerificationMethod" NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmarcReport_reporterId_idx" ON "DmarcReport"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "DmarcReport_reportId_orgName_key" ON "DmarcReport"("reportId", "orgName");

-- CreateIndex
CREATE INDEX "Record_sourceIp_idx" ON "Record"("sourceIp");

-- CreateIndex
CREATE INDEX "Record_headerFrom_idx" ON "Record"("headerFrom");

-- CreateIndex
CREATE UNIQUE INDEX "KnownReporter_orgEmail_key" ON "KnownReporter"("orgEmail");

-- CreateIndex
CREATE INDEX "KnownReporter_orgEmail_idx" ON "KnownReporter"("orgEmail");

-- CreateIndex
CREATE INDEX "KnownReporter_status_trustLevel_idx" ON "KnownReporter"("status", "trustLevel");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE INDEX "DomainOwnership_domain_idx" ON "DomainOwnership"("domain");

-- CreateIndex
CREATE INDEX "DomainOwnership_userId_idx" ON "DomainOwnership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainOwnership_domain_userId_key" ON "DomainOwnership"("domain", "userId");

-- AddForeignKey
ALTER TABLE "DmarcReport" ADD CONSTRAINT "DmarcReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "KnownReporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DmarcReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainOwnership" ADD CONSTRAINT "DomainOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
