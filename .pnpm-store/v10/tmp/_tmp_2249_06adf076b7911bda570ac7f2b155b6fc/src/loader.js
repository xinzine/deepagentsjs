'use strict';

const path = require('path');
const fs = require('fs');
const primordials = require('./primordials');
const internalBinding = require('./internal-binding');
const internalModules = require('./internal-modules');

// Path to vendor VFS code
const VENDOR_VFS_PATH = path.join(__dirname, '..', 'vendor', 'vfs-upstream', 'lib', 'internal', 'vfs');

// Module cache
const cache = new Map();

/**
 * Creates a require function for vendor VFS modules
 */
function createRequire(parentPath) {
  return function vfsRequire(id) {
    // Handle internal/vfs/* modules - load from vendor
    if (id.startsWith('internal/vfs/')) {
      const modulePath = path.join(VENDOR_VFS_PATH, id.slice('internal/vfs/'.length) + '.js');
      return loadModule(modulePath);
    }

    // Handle other internal/* modules - use our shims
    if (id.startsWith('internal/')) {
      if (internalModules[id]) return internalModules[id];
      throw new Error(`Unknown internal module: ${id}`);
    }

    // Regular Node.js require
    return require(id);
  };
}

/**
 * Loads a vendor VFS module with primordials and internalBinding injected
 */
function loadModule(modulePath) {
  if (cache.has(modulePath)) {
    return cache.get(modulePath).exports;
  }

  const code = fs.readFileSync(modulePath, 'utf8');
  const mod = { exports: {}, id: modulePath, filename: modulePath };
  cache.set(modulePath, mod);

  // Wrap code to inject our globals
  const wrapped = `(function(exports, require, module, __filename, __dirname, primordials, internalBinding) {\n${code}\n})`;
  const fn = eval(wrapped);

  const moduleDir = path.dirname(modulePath);
  fn(mod.exports, createRequire(modulePath), mod, modulePath, moduleDir, primordials, internalBinding);

  return mod.exports;
}

/**
 * Load a specific VFS module by name
 */
function load(name) {
  return loadModule(path.join(VENDOR_VFS_PATH, name + '.js'));
}

/**
 * Load a provider module
 */
function loadProvider(name) {
  return loadModule(path.join(VENDOR_VFS_PATH, 'providers', name + '.js'));
}

module.exports = { load, loadProvider };
