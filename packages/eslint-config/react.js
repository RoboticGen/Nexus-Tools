import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

import base from "./base.js";

export default [
  ...base,

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      // v7 ships flat presets, but the plugin object is registered explicitly
      // so the rule names below keep resolving under either entry point.
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
