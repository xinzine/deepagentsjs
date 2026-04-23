# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

User-land implementation of the Node.js Virtual File System (VFS) based on [nodejs/node#61478](https://github.com/nodejs/node/pull/61478). This library allows mounting an in-memory filesystem that intercepts standard `fs` module calls through monkey-patching.

## Commands

```bash
pnpm install          # Install dependencies
pnpm test             # Run test suite
pnpm lint             # Check linting with Biome
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with Biome
pnpm knip             # Check for unused exports/dependencies
```

Run a single test:
```bash
node vendor/vfs-upstream/run-tests.js test-vfs-basic.js
```

## Architecture

### Design Principle

**We do not modify `vendor/vfs-upstream/`**. The vendor directory contains code based on the upstream Node.js VFS PR. All extensions are layered on top via `src/` and `index.js`. See `UPSTREAM.md` for details on our extensions.

### Core Components

- **`index.js`** - Entry point that loads vendor classes and layers on extensions
- **`vendor/vfs-upstream/lib/internal/vfs/file_system.js`** - `VirtualFileSystem` class (upstream)
- **`vendor/vfs-upstream/lib/internal/vfs/provider.js`** - `VirtualProvider` base class (upstream)
- **`vendor/vfs-upstream/lib/internal/vfs/providers/memory.js`** - `MemoryProvider` (upstream)
- **`vendor/vfs-upstream/lib/internal/vfs/module_hooks.js`** - fs monkey-patching (upstream)
- **`src/write-stream.js`** - `VirtualWriteStream` extension (our addition)
- **`src/loader.js`** - Loads vendor modules with injected primordials/internalBinding
- **`src/primordials.js`** - Shims for Node.js internal frozen built-ins
- **`src/internal-binding.js`** - Shims for native bindings (UV errors, fs constants)
- **`src/internal-modules.js`** - Shims for internal modules (errors, Stats, Dirent)

### Key Design Patterns

1. **Provider Pattern**: `VirtualFileSystem` delegates storage operations to a `VirtualProvider`. The `MemoryProvider` is the default, but custom providers (e.g., NFS, WebDAV) can be implemented.

2. **Mount-based Interception**: When `vfs.mount('/prefix')` is called:
   - The VFS registers with `module_hooks.js`
   - All `fs.*` calls are intercepted
   - Paths under the mount point are routed to the VFS provider
   - Other paths fall through to the real filesystem

3. **Overlay Mode**: When `overlay: true`, the VFS only handles paths that exist in the virtual filesystem, allowing real files to show through.

4. **VFS File Descriptors**: Start at 10000 to avoid conflicts with real OS file descriptors.

5. **Layered Extensions**: Extensions like `WriteStream` are added via prototype patching in `index.js`, keeping vendor code untouched.

### File Structure

```
index.js                    # Entry point, wires extensions to upstream
src/
  loader.js                 # Module loader for vendor code
  primordials.js            # Node.js primordials shims
  internal-binding.js       # Native binding shims
  internal-modules.js       # Internal module shims (errors, Stats, etc.)
  write-stream.js           # VirtualWriteStream extension
vendor/vfs-upstream/
  lib/internal/vfs/         # Core VFS implementation (upstream)
    file_system.js          # VirtualFileSystem class
    provider.js             # VirtualProvider base class
    providers/memory.js     # MemoryProvider
    providers/real.js       # RealFSProvider
    module_hooks.js         # fs module interception
    file_handle.js          # File handle classes
    stats.js                # Stats creation
    errors.js               # Error factories
    streams.js              # VirtualReadStream
    watcher.js              # File watching
    router.js               # Path utilities
    fd.js                   # File descriptor management
  test/parallel/            # Tests
  run-tests.js              # Test runner
```

## Documentation

- **`UPSTREAM.md`** - Documents our extensions to upstream (WriteStream, etc.)
- **`REVIEW.md`** - Code review with recommendations

## Code Style

- Biome for linting and formatting
- Single quotes, semicolons, ES5 trailing commas
- 2-space indentation
- CommonJS modules (not ESM)
- Requires Node.js >= 22.0.0
