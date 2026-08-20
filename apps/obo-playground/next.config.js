/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus-tools/auth", "@nexus-tools/design-system"],
};

module.exports = nextConfig;
