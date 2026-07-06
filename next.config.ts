import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client"],
  cacheLife: {
    default: {
      stale: 300,
      revalidate: 900,
      expire: 3600,
    },
  },
};

export default nextConfig;
