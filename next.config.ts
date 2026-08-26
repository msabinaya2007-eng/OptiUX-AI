import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  serverExternalPackages: [
    "@sparticuz/chromium",
    "playwright-core",
    "playwright",
  ],
};

export default nextConfig;