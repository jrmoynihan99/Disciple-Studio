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
  async redirects() {
    return [
      // v2 and v3 were where this site was built before it became the site
      // itself. Both were shared around while in progress, so keep every link
      // that went out pointing at the real page: /v3/cms is now just /cms.
      { source: "/v2", destination: "/", permanent: false },
      { source: "/v3", destination: "/", permanent: false },
      { source: "/v3/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default nextConfig;