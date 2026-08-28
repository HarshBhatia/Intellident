import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  trailingSlash: false,
  // Optimize for serverless deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Updated config for Next.js 16
  skipProxyUrlNormalize: false,
  skipTrailingSlashRedirect: false,
};

export default nextConfig;
