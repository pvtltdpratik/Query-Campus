import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// AWS RDS rejects unencrypted connections, so make sure the migration engine
// always asks for SSL even when DATABASE_URL carries no sslmode.
function withSsl(url: string): string {
  if (/[?&]sslmode=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: withSsl(env("DATABASE_URL")),
  },
});
