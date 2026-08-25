import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  serverExternalPackages: ["playwright"],

  outputFileTracingIncludes: {
    "/api/analyze/**": [
      "./node_modules/playwright-core/browsers.json",
    ],
  },
};

export default nextConfig;