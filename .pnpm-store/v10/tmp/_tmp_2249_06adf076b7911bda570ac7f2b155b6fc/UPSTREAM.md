# Upstream Extensions

This document describes modifications and extensions made on top of the upstream Node.js VFS implementation ([nodejs/node#61478](https://github.com/nodejs/node/pull/61478)).

## Design Principle

**We do not modify `vendor/vfs-upstream/`**. All extensions are layered on top via:
- `src/` - Polyfill shims and extensions
- `index.js` - Integration point that wires extensions to upstream classes

This allows us to:
1. Pull upstream updates cleanly
2. Clearly separate our additions from upstream code
3. Potentially contribute extensions back upstream

---

## Extensions

### 1. `createWriteStream()` - WriteStream Support

**Location**: `src/write-stream.js`, integrated via `index.js`

**Why**: Upstream only implements `createReadStream()`. The upstream focus is SEA (Single Executable Applications) which are read-only. We need write streams for NFS and other writable backends.

**Implementation**:
```javascript
// index.js - layered onto VirtualFileSystem prototype
VirtualFileSystem.prototype.createWriteStream = function(filePath, options) {
  return createVirtualWriteStream(this, filePath, options);
};
```

**API**:
```javascript
const stream = vfs.createWriteStream(path, options);
```

**Options**:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `flags` | string | `'w'` | File open flags (`'w'`, `'a'`, `'r+'`, etc.) |
| `mode` | number | `0o666` | File mode for new files |
| `start` | number | `undefined` | Position to start writing (requires `'r+'`) |
| `autoClose` | boolean | `true` | Auto-close file on finish/error |
| `encoding` | string | `undefined` | Default encoding for string writes |
| `highWaterMark` | number | `16384` | Buffer size threshold |

**Events**:
- `open` - Emitted with fd when file is opened
- `ready` - Emitted when stream is ready to write
- `finish` - Emitted when all data has been flushed
- `close` - Emitted when file is closed
- `error` - Emitted on error
- `bytes-written` - Custom event, emitted after each write with byte count

**Example**:
```javascript
const vfs = require('node-vfs-polyfill');
const myVfs = vfs.create();

// Basic write
const stream = myVfs.createWriteStream('/file.txt');
stream.write('hello ');
stream.end('world');

// Append mode
const appendStream = myVfs.createWriteStream('/log.txt', { flags: 'a' });
appendStream.end('new log entry\n');

// Write at position
const posStream = myVfs.createWriteStream('/data.bin', { flags: 'r+', start: 100 });
posStream.end(Buffer.from([0x00, 0x01, 0x02]));

// Pipe from another stream
readableStream.pipe(myVfs.createWriteStream('/output.txt'));
```

---

## Upstream Limitations (Not Extended)

These are limitations in upstream that we have **not** addressed:

| Feature | Status | Notes |
|---------|--------|-------|
| `chmod` / `chown` | Missing | Not in upstream |
| `utimes` | Missing | Not in upstream |
| `link` (hard links) | Missing | Not in upstream |
| `mkdtemp` | Missing | Not in upstream |
| `cp` / `rm` recursive | Missing | Not in upstream |
| `truncate` at VFS level | Missing | Only on file handle |
| ESM import hooks | Limited | `Module.registerHooks` shimmed to no-op |

---

## Polyfill Shims (`src/`)

These files provide Node.js internal APIs needed by upstream code:

### `src/loader.js`
Loads vendor modules with injected `primordials` and `internalBinding` globals.

### `src/primordials.js`
Shims for frozen built-in methods used by Node.js internals:
- `ArrayPrototypePush`, `StringPrototypeStartsWith`, etc.
- `SafeMap`, `SafeSet`
- `DateNow`, `MathFloor`, etc.

### `src/internal-binding.js`
Shims for native bindings:
- `uv` - UV error codes (ENOENT, EISDIR, etc.)
- `constants.fs` - File type constants (S_IFREG, S_IFDIR, etc.)
- `sea` - SEA bindings (stubbed)

### `src/internal-modules.js`
Shims for internal Node.js modules:
- `internal/errors` - UVException, ERR_* error classes
- `internal/validators` - validateBoolean, etc.
- `internal/util` - kEmptyObject, getLazy, etc.
- `internal/fs/utils` - Stats, Dirent classes
- `internal/url` - URL utilities

---

## Test Harness Extensions

### `common.expectWarning()`

**Location**: `vendor/vfs-upstream/test/common.js`

Added `expectWarning(type, messages)` to support tests that expect process warnings:

```javascript
common.expectWarning(
  'ExperimentalWarning',
  'Module._stat is an experimental feature and might change at any time'
);
```

This sets up a listener that validates warnings match expectations. Note that in multi-test runs, warnings may only fire once per process, so tests should not strictly require warnings.

### Test Modifications

**`test-vfs-overlay.js`**: Worker thread tests wrapped in `if (false)` block since workers require native `node:vfs`. All other overlay tests run normally.

**`test-vfs.js`**: Warning listener changed from `mustCall()` to regular callback since the experimental warning may have already fired in earlier tests.

---

## Testing

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| `test-vfs-write-stream.js` | WriteStream extension (16 test cases) |
| `test-vfs-overlay.js` | Overlay mode (worker tests skipped) |
| `test-vfs.js` | Module._stat patching |

### Skipped Tests

| Test | Reason |
|------|--------|
| `test-vfs-chdir-worker.js` | Entirely worker-based, requires native `node:vfs` |
| `test-vfs-sea.js` | Requires `node:sea` built-in module |

### Running Tests

Run all tests:
```bash
pnpm test
# or
node vendor/vfs-upstream/run-tests.js
```

Run specific test:
```bash
node vendor/vfs-upstream/run-tests.js test-vfs-write-stream.js
```

---

## Contributing Back to Upstream

If contributing `createWriteStream` upstream:

1. Move `VirtualWriteStream` class to `vendor/vfs-upstream/lib/internal/vfs/streams.js`
2. Add `createWriteStream` method to `VirtualFileSystem` in `file_system.js`
3. Convert to use `primordials` style (no direct built-in access)
4. Add to `module_hooks.js` to hook `fs.createWriteStream`
5. Update tests to use Node.js test harness style

The implementation is designed to be upstreamable with minimal changes.
