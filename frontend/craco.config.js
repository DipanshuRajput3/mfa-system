// craco.config.js
const path = require("path");
require("dotenv").config();

// Environment flags
const isDevServer = process.env.NODE_ENV !== "production";

const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
  enableVisualEdits: isDevServer, // optional visual edits
};

// Optional visual edits plugins (won't crash if missing)
let setupDevServer;
let babelMetadataPlugin;

if (config.enableVisualEdits) {
  try {
    setupDevServer = require("./plugins/visual-edits/dev-server-setup");
  } catch (e) {
    console.warn("Visual Edits dev-server-setup not found, skipping...");
  }

  try {
    babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
  } catch (e) {
    console.warn("Visual Edits babel-metadata-plugin not found, skipping...");
  }
}

// Optional health check plugins
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  try {
    WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
    setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
    healthPluginInstance = new WebpackHealthPlugin();
  } catch (e) {
    console.warn("Health check plugins not found, skipping...");
  }
}

// Base CRACO webpack config
const webpackConfig = {
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

      // Add health plugin if available
      if (config.enableHealthCheck && healthPluginInstance) {
        cfg.plugins.push(healthPluginInstance);
      }

      return cfg;
    },
  },
};

// Add Babel plugin if available
if (config.enableVisualEdits && babelMetadataPlugin) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

// Dev server setup
webpackConfig.devServer = (devServerConfig) => {
  // Visual edits dev server setup
  if (config.enableVisualEdits && setupDevServer) {
    devServerConfig = setupDevServer(devServerConfig);
  }

  // Health check endpoints
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetup = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetup) {
        middlewares = originalSetup(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  return devServerConfig;
};

module.exports = webpackConfig;
