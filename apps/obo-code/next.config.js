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
  webpack: (config) => {
    // esptool-js lazily `import()`s its per-chip ROM target modules
    // (lib/targets/esp32.js, etc.) at flash time. Next/webpack splits each
    // into a separate async chunk that is fetched mid-flash; a stale or
    // missing chunk then fails the flash with a ChunkLoadError. Force these
    // dynamic imports to bundle eagerly into the parent chunk so no runtime
    // chunk fetch is needed once flashing has started.
    config.module.rules.push({
      test: /esptool-js[\\/]lib[\\/]esploader\.js$/,
      parser: { dynamicImportMode: "eager" },
    });
    return config;
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
