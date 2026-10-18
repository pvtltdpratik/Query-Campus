import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // pg ignores URL-level sslmode when `ssl` is passed, so strip it and decide here.
  // AWS RDS requires TLS. Supply DATABASE_CA_CERT (the RDS CA bundle) to verify the
  // server certificate; otherwise the connection is encrypted but not verified.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const ca = process.env.DATABASE_CA_CERT;

  const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: ca ? { ca } : { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
