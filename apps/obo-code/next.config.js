/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus-tools/ui", "@nexus-tools/utils", "@nexus-tools/types"],
  experimental: {
    optimizePackageImports: ["@nexus-tools/ui"],
  },
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      {
        source: "/firmware/:path*",
        destination: "https://micropython.org/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
