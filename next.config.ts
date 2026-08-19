import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
