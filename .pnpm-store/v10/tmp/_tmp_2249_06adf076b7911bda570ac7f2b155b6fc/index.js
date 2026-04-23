'use strict';

const loader = require('./src/loader');

// Load VFS classes from vendor
const { VirtualFileSystem } = loader.load('file_system');
const { VirtualProvider } = loader.load('provider');
const { MemoryProvider } = loader.loadProvider('memory');
const { RealFSProvider } = loader.loadProvider('real');

// Load WriteStream extension (layered on top of upstream)
const {
  VirtualWriteStream,
  createVirtualWriteStream,
} = require('./src/write-stream');

// Add createWriteStream to VirtualFileSystem prototype
// This extends upstream without modifying vendor code
VirtualFileSystem.prototype.createWriteStream = function(filePath, options) {
  return createVirtualWriteStream(this, filePath, options);
};

/**
 * Create a new VirtualFileSystem instance
 * @param {VirtualProvider|object} [providerOrOptions] A provider or options
 * @param {object} [options] Options if first arg is provider
 * @returns {VirtualFileSystem}
 */
function create(providerOrOptions, options) {
  if (providerOrOptions instanceof VirtualProvider) {
    return new VirtualFileSystem(providerOrOptions, options);
  }
  return new VirtualFileSystem(providerOrOptions);
}

module.exports = {
  create,
  VirtualFileSystem,
  VirtualProvider,
  MemoryProvider,
  RealFSProvider,
  VirtualWriteStream,
};
