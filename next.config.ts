import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify SSR Lambdas don't reliably receive console env vars at runtime.
  // Embedding DATABASE_URL at build time (when Amplify DOES inject it) ensures
  // Prisma can connect in all Lambda containers.
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
  },
};

export default nextConfig;
