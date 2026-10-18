import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Show the Lifeguard page at the plain address (lifeguard.compare) instead of /index.html.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
