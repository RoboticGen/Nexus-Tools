module.exports = {
  root: true,
  extends: ["@nexus-tools/eslint-config/next"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
