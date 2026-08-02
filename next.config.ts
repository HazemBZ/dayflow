import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@libsql/client"],
  async redirects() {
    return [
      {
        source: "/bugs/:path*",
        destination: "/todos/:path*",
        permanent: true,
      },
    ];
  },
  cacheLife: {
    default: {
      stale: 300,
      revalidate: 900,
      expire: 3600,
    },
  },
};

export default nextConfig;
