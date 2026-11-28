const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const mobileNodeModules = path.resolve(__dirname, "node_modules");
const existingNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
if (!existingNodePath.includes(mobileNodeModules)) {
  process.env.NODE_PATH = [mobileNodeModules, ...existingNodePath].filter(Boolean).join(path.delimiter);
  require("module").Module._initPaths();
}

const config = getDefaultConfig(__dirname);
const rootNodeModules = path.resolve(__dirname, "..", "node_modules");
if (!config.watchFolders || config.watchFolders.length === 0) {
  config.watchFolders = [rootNodeModules];
}
if (!config.resolver.nodeModulesPaths || config.resolver.nodeModulesPaths.length === 0) {
  config.resolver.nodeModulesPaths = [mobileNodeModules, rootNodeModules];
}

// Monorepo root hoists React 19 (for frontend), while mobile uses React 18.3.1.
// Force all `react` and `react-dom` imports (including from hoisted root packages)
// to resolve from mobile/node_modules so React 18 $$typeof matches React Native 0.76.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.join(mobileNodeModules, "react"),
  "react-dom": path.join(mobileNodeModules, "react-dom"),
};

const origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/")
  ) {
    const mobileOrigin = path.join(__dirname, "package.json");
    const nextCtx = { ...context, originModulePath: mobileOrigin };
    return origResolveRequest
      ? origResolveRequest(nextCtx, moduleName, platform)
      : context.resolveRequest(nextCtx, moduleName, platform);
  }
  return origResolveRequest
    ? origResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
