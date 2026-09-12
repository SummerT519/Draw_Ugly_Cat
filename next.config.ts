import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  allowedDevOrigins: ["192.168.20.5"],
};

export default nextConfig;
