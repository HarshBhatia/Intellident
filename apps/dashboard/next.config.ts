import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Optimize for serverless deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure middleware is properly handled on Netlify
  skipMiddlewareUrlNormalize: false,
  skipTrailingSlashRedirect: false,
};

export default nextConfig;
