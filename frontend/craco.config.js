// craco.config.js
const path = require("path");

module.exports = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (cfg) => {
      // Reduce watched directories
      cfg.watchOptions = {
        ...cfg.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/build/**", "**/dist/**", "**/coverage/**", "**/public/**"],
      };
      return cfg;
    },
  },
};
