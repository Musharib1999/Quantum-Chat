import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
