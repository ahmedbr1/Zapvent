import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@mui/icons-material",
      "@mui/material",
      "@mui/lab",
      "@mui/x-data-grid",
      "@mui/x-date-pickers",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  // Enable React strict mode for better performance debugging
  reactStrictMode: true,
  // Power prefix for static assets
  poweredByHeader: false,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
