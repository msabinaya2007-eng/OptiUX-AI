import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  serverExternalPackages: [
    "@sparticuz/chromium",
    "playwright-core",
    "playwright",
  ],

  outputFileTracingIncludes: {
    "/api/analyze": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;