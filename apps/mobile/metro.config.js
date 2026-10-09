// Metro config for the Verma Expo app inside the pnpm monorepo.
// Without this, Metro resolves the entry from the repo root and cannot find
// `./index` or the workspace-hoisted node_modules. We point Metro at this
// package as the project root and add the monorepo root as a watch folder so
// hoisted (`node_modules/.pnpm`) and workspace packages resolve.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm uses symlinks; let Metro follow them to the real package locations.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
