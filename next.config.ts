import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack's persistent dev filesystem cache is on by default since Next
    // 16.1. On this project it ballooned to ~780MB (single ~200MB cache
    // entries) and pinned CPU/memory to 100% on the first route compile, hard-
    // freezing the machine. Disable it: compiles cold-start a bit slower but
    // the dev server is stable. Re-enable once the beta cache is reliable here.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    // Demo assets (church logos, hero photos) are typically pulled from the
    // church's existing site or a CDN. Allow https remote images by default.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;