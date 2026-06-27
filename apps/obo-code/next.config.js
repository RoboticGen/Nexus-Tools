/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus-tools/ui", "@nexus-tools/utils", "@nexus-tools/types", "@nexus-tools/auth"],
  experimental: {
    optimizePackageImports: ["@nexus-tools/ui"],
  },
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;
