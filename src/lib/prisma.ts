import { PrismaClient } from "@prisma/client";

declare global {
  var __jobmatch_prisma: PrismaClient | undefined;
}

export const prisma =
  global.__jobmatch_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__jobmatch_prisma = prisma;
}
