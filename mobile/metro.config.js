const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the shared package source too
config.watchFolders = [workspaceRoot];

// Make Metro look in mobile/node_modules FIRST, then workspace root
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(workspaceRoot, "node_modules"),
];

// Ensure Metro picks up .ts/.tsx for the shared package
config.resolver.sourceExts = [...config.resolver.sourceExts, "ts", "tsx", "cjs", "mjs"];

module.exports = config;
