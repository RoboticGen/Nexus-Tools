/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@nexus-tools/auth",
    "@nexus-tools/design-system",
    "@nexus-tools/esp32-uploader",
    "@nexus-tools/monaco-editor",
    "@nexus-tools/skulpt-executor",
  ],
  images: {
    remotePatterns: [],
  },
  // `dev`/`build` pass `--webpack` on purpose: Next 16 defaults to Turbopack, which silently ignores the hook below, and the only symptom is a ChunkLoadError mid-flash on real hardware.
  webpack: (config) => {
    // esptool-js lazily `import()`s per-chip ROM targets at flash time; bundling them eagerly avoids a runtime chunk fetch once flashing has started.
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
