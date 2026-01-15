module.exports = {
  root: true,
  extends: ["@nexus-tools/eslint-config/base"],
  settings: {
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
