import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The portal is fully authenticated and per-user, so nothing can be prerendered into a static
    // shell. Only validate routes that explicitly export `instant` instead of warning on every page.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    // Pin the workspace root so a stray lockfile in a parent folder is not picked up.
    root: path.resolve(import.meta.dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
