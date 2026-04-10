/**
 * Enhanced Metro Configuration for Bundle Optimization
 * - Completely disables React Native DevTools to prevent chrome-sandbox errors
 * - Excludes Node-specific dependencies (cheerio, axios) from RN bundle
 * - Optimizes NativeWind/Tailwind integration
 * - Enables aggressive code pruning
 */

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// ── CRITICAL: Completely disable React Native DevTools ──────────────────────
// This prevents chrome-sandbox errors and DevTools installation
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Block all DevTools-related requests
      if (req.url.includes("devtools") || req.url.includes("debugger")) {
        res.statusCode = 404;
        res.end("DevTools disabled");
        return;
      }
      return middleware(req, res, next);
    };
  },
};

// Disable DevTools completely
process.env.REACT_NATIVE_DEBUGGER = "disabled";
process.env.EXPO_DEVTOOLS_ENABLED = "false";
process.env.RN_DEBUGGER_ACTIVE = "false";

// ── CRITICAL: Exclude scraper utilities from bundling ──────────────────────
// These are Node.js-only scripts that should NEVER be in the app bundle
const scrapersPattern = [
  /src\/utils\/(runAllTimetables|watchTimetables)\.js$/,
  /src\/utils\/(appliedscience|bca|civil|cse|ece|electrical|it|mechanical)\/scrapeTimetable\.js$/,
];

config.resolver.blacklistRE = [
  ...(config.resolver.blacklistRE || []),
  ...scrapersPattern,
];

// ── Prevent Node.js-only modules from being bundled ──────────────────────
// These will cause errors if accidentally imported in app code
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  cheerio: null, // HTML parser (Node.js only)
  axios: null, // HTTP client (replaced with fetch)
  "node-fetch": null, // Node.js fetch polyfill
  jsdom: null, // DOM implementation (Node.js only)
  assert: null, // Node.js assert module
};

// ── Optimize transformer for production ────────────────────────────────────
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// ── Integrate NativeWind with optimizations ──────────────────────────────
module.exports = withNativeWind(config, {
  input: "./src/global.css",
  inlineRem: 16,
});
