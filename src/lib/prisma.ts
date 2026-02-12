/**
 * @module PrismaClient
 * @description Singleton Prisma client instance.
 * Import `prisma` from "@/lib/prisma" everywhere.
 * NEVER create new PrismaClient() anywhere else.
 *
 * Prisma 7 requires a driver adapter (no built-in engine).
 * Uses @prisma/adapter-pg for PostgreSQL.
 *
 * @see copilot-instructions.md — Section 7
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
