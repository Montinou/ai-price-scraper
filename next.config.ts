import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for AI SDK streaming
  experimental: {
    // serverActions are enabled by default in Next.js 16
  },
};

export default nextConfig;
