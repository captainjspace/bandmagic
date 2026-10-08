import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    allowedDevOrigins: process.env.allowed_dev_origins,
  },
  output: "standalone",
  allowedDevOrigins: [process.env.allowedDevOrigins],
};

export default nextConfig;
