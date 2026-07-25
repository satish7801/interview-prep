import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static JSON under /public/content is served as-is on Vercel
  poweredByHeader: false,
};

export default nextConfig;
