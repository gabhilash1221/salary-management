-- AlterTable
ALTER TABLE "User" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'day';
ALTER TABLE "User" ADD COLUMN "avatar" BLOB;
ALTER TABLE "User" ADD COLUMN "avatarType" TEXT;

UPDATE "User" SET "displayName" = 'HR Manager' WHERE "email" = 'hr.manager@acme.test';
UPDATE "User" SET "displayName" = 'HR Viewer' WHERE "email" = 'hr.viewer@acme.test';
UPDATE "User" SET "displayName" = 'Directory User' WHERE "email" = 'directory.user@acme.test';
UPDATE "User" SET "displayName" = 'Auditor' WHERE "email" = 'auditor@acme.test';
