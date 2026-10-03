import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jupa/shared", "@jupa/db"],
};

export default nextConfig;
