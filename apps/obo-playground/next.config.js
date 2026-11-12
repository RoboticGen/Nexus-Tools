/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@nexus-tools/auth",
    "@nexus-tools/blockly-python-generator",
    "@nexus-tools/design-system",
    "@nexus-tools/monaco-editor",
    "@nexus-tools/skulpt-executor",
  ],
  // `dev`/`build` pass `--webpack` like the sibling apps: Turbopack ignores this hook.
  webpack: (config, { isServer }) => {
    // @mujoco/mujoco only imports Node's `module` on its Node code path; browsers never reach it.
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, module: false };
    return config;
  },
};

module.exports = nextConfig;
