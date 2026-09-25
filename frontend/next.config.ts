import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd()
  },
  experimental: {
    webpackMemoryOptimizations: true
  }
};

export default nextConfig;
