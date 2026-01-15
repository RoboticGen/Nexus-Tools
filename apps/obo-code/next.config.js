/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus-tools/ui", "@nexus-tools/utils", "@nexus-tools/types"],
  experimental: {
    optimizePackageImports: ["@nexus-tools/ui"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "skulpt.org",
      },
    ],
  },
};

module.exports = nextConfig;
