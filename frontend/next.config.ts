import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd()
  },
  experimental: {
    webpackMemoryOptimizations: true
  },
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL ?? "http://localhost:4000";
    return [
      { source: "/auth/:path*", destination: `${backendUrl}/auth/:path*` },
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/admin/:path*", destination: `${backendUrl}/admin/:path*` },
      { source: "/users/:path*", destination: `${backendUrl}/users/:path*` },
    ];
  },
};

export default nextConfig;
