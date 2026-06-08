import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '192.168.99.239',
    '192.168.3.13'
  ],
};

export default nextConfig;
