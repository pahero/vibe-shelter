ALTER TYPE "UserRole" ADD VALUE 'OWNER';
UPDATE "User" SET "role" = 'OWNER' WHERE "role" = 'ADMIN';
