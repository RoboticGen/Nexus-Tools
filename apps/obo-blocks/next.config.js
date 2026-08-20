/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@nexus-tools/auth",
    "@nexus-tools/blockly-python-generator",
    "@nexus-tools/design-system",
    "@nexus-tools/esp32-uploader",
    "@nexus-tools/micropython-esp32",
    "@nexus-tools/monaco-editor",
    "@nexus-tools/pyodide-executor",
  ],
  // `dev`/`build` pass `--webpack` on purpose: Next 16 defaults to Turbopack, which silently ignores the hook below, and the only symptom is a ChunkLoadError mid-flash on real hardware.
  webpack: (config) => {
    // esptool-js lazily `import()`s per-chip ROM targets at flash time; bundling them eagerly avoids a runtime chunk fetch once flashing has started.
    config.module.rules.push({
      test: /esptool-js[\\/]lib[\\/]esploader\.js$/,
      parser: { dynamicImportMode: "eager" },
    });
    return config;
  },
};

module.exports = nextConfig;
