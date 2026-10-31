import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdfjs out of the webpack server bundle so its worker resolves from node_modules.
  serverExternalPackages: ["pdfjs-dist"],
  // Debug ingest writes NDJSON under `.cursor/`; watching that path causes an HMR reload loop.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules|\.git|\.next|\.cursor/,
      };
    }
    return config;
  },
};

export default nextConfig;
