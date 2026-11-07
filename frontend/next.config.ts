import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    webpackMemoryOptimizations: true,
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

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  sourcemaps: {
    // Upload only when CI supplies Better Stack's source-map credentials.
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
