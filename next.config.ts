import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    allowedDevOrigins: process.env.allowed_dev_origins,
  },
  output: "standalone",
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    `" ${process.env.allowedDevOrigins} "`,
  ]
}

export default nextConfig;
