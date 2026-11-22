import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/quantum-assistant",
        destination: "/ide",
        permanent: true,
      },
      {
        source: "/quantum-assistant/:path*",
        destination: "/ide",
        permanent: true,
      },
      {
        source: "/optimization",
        destination: "/ide",
        permanent: true,
      },
      {
        source: "/showcase",
        destination: "/ide",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
