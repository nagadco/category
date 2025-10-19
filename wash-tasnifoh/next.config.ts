import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow production builds to pass even if ESLint finds issues
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
