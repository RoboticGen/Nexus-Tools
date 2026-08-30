import next from "eslint-config-next";

import react from "./react.js";

/**
 * `eslint-config-next` is flat-config-native from v16, so it is spread rather
 * than named in `extends` — and it brings its own `@next/next` plugin
 * registration, which is why nothing here declares it.
 */
export default [
  ...react,
  ...next,

  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
