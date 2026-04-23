# node-vfs-polyfill

User-land implementation of the Node.js Virtual File System (VFS) based on [nodejs/node#61478](https://github.com/nodejs/node/pull/61478).

## Installation

```bash
npm install node-vfs-polyfill
```

Requires Node.js >= 22.0.0

## Usage

```javascript
const { VirtualFS } = require('node-vfs-polyfill');

const vfs = new VirtualFS();
vfs.mkdirSync('/app');
vfs.writeFileSync('/app/index.js', 'console.log("hello")');
vfs.mount('/vfs');

// After mounting, use standard fs module
const fs = require('fs');
fs.readFileSync('/vfs/app/index.js'); // works
```

## Features

- In-memory file system with full fs API support
- Overlay mode for layering virtual files over real filesystem
- File descriptors, streams, and watch support
- Promise-based API via `fs.promises`
- Symlinks and glob patterns

## Exports

- `node-vfs-polyfill` - Main VirtualFS class
- `node-vfs-polyfill/provider` - Base provider interface
- `node-vfs-polyfill/memory-provider` - In-memory storage provider

## License

ISC

Code in `vendor/vfs-upstream/` is from Node.js and subject to the [Node.js license](vendor/vfs-upstream/LICENSE).
