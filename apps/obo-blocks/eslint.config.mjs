import next from "@nexus-tools/eslint-config/next";

export default [
  ...next,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
