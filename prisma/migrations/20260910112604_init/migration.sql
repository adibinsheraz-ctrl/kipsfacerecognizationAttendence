-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "thumbnail" TEXT,
    "embeddings" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'face',
    "confidence" REAL,
    "livenessPassed" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    CONSTRAINT "Attendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecognitionAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "distance" REAL,
    "ipHint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "collegeName" TEXT NOT NULL DEFAULT 'Kips College G-9',
    "matchThreshold" REAL NOT NULL DEFAULT 0.5,
    "cameraFacing" TEXT NOT NULL DEFAULT 'user',
    "requireLiveness" BOOLEAN NOT NULL DEFAULT true,
    "darkModeDefault" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_rollNumber_key" ON "Person"("rollNumber");

-- CreateIndex
CREATE INDEX "Attendance_markedAt_idx" ON "Attendance"("markedAt");

-- CreateIndex
CREATE INDEX "Attendance_personId_markedAt_idx" ON "Attendance"("personId", "markedAt");

-- CreateIndex
CREATE INDEX "RecognitionAttempt_createdAt_idx" ON "RecognitionAttempt"("createdAt");
