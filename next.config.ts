import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Demo assets (church logos, hero photos) are typically pulled from the
    // church's existing site or a CDN. Allow https remote images by default.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;