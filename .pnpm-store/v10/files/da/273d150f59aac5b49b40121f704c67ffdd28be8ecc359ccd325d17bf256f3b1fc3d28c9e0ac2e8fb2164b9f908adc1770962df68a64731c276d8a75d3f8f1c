'use strict';

const { Writable } = require('stream');

/**
 * A writable stream for virtual files.
 */
class VirtualWriteStream extends Writable {
  #vfs;
  #path;
  #fd = null;
  #pos;
  #flags;
  #mode;
  #autoClose;
  #destroyed = false;

  /**
   * @param {VirtualFileSystem} vfs The VFS instance
   * @param {string} filePath The path to the file
   * @param {object} [options] Stream options
   * @param {string} [options.flags='w'] File open flags
   * @param {number} [options.mode=0o666] File mode for new files
   * @param {number} [options.start] Position to start writing
   * @param {boolean} [options.autoClose=true] Auto-close on finish/error
   * @param {string} [options.encoding] Default encoding for string writes
   * @param {number} [options.highWaterMark] Buffer size threshold
   */
  constructor(vfs, filePath, options = {}) {
    const {
      flags = 'w',
      mode = 0o666,
      start,
      autoClose = true,
      encoding,
      highWaterMark = 16 * 1024,
      ...streamOptions
    } = options;

    super({ ...streamOptions, highWaterMark, defaultEncoding: encoding });

    this.#vfs = vfs;
    this.#path = filePath;
    this.#flags = flags;
    this.#mode = mode;
    this.#autoClose = autoClose;

    // For append mode, position is managed by the file handle
    // For write mode with start, use the specified position
    this.#pos = start !== undefined ? start : null;

    // Open the file on next tick so listeners can be attached
    process.nextTick(() => this.#openFile());
  }

  /**
   * Gets the file path.
   * @returns {string}
   */
  get path() {
    return this.#path;
  }

  /**
   * Gets whether the stream will auto-close.
   * @returns {boolean}
   */
  get autoClose() {
    return this.#autoClose;
  }

  /**
   * Gets the file descriptor, or null if not open.
   * @returns {number|null}
   */
  get fd() {
    return this.#fd;
  }

  /**
   * Opens the virtual file.
   */
  #openFile() {
    if (this.#destroyed) return;

    try {
      this.#fd = this.#vfs.openSync(this.#path, this.#flags, this.#mode);
      this.emit('open', this.#fd);
      this.emit('ready');
    } catch (err) {
      this.destroy(err);
    }
  }

  /**
   * Gets the VirtualFD for the current file descriptor.
   * @returns {VirtualFD|null}
   */
  #getVirtualFd() {
    if (this.#fd === null) return null;

    // Access fd module through the loader to get VirtualFD
    const loader = require('./loader');
    const { getVirtualFd } = loader.load('fd');
    return getVirtualFd(this.#fd);
  }

  /**
   * Implements the writable _write method.
   * @param {Buffer|string} chunk The data to write
   * @param {string} encoding The encoding if chunk is a string
   * @param {Function} callback Callback when write completes
   */
  _write(chunk, encoding, callback) {
    if (this.#destroyed) {
      callback(new Error('Stream has been destroyed'));
      return;
    }

    if (this.#fd === null) {
      // File not open yet, wait for it
      this.once('open', () => this._write(chunk, encoding, callback));
      return;
    }

    const vfd = this.#getVirtualFd();
    if (!vfd) {
      callback(this.#createBadFdError());
      return;
    }

    try {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);

      // Determine write position
      const writePos = this.#pos;

      // Write using the file handle
      const bytesWritten = vfd.entry.writeSync(buffer, 0, buffer.length, writePos);

      // Update position if we're tracking it (not append mode)
      if (this.#pos !== null) {
        this.#pos += bytesWritten;
      }

      this.emit('bytes-written', bytesWritten);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Implements the writable _writev method for batch writes.
   * @param {Array<{chunk: Buffer, encoding: string}>} chunks Array of chunks
   * @param {Function} callback Callback when write completes
   */
  _writev(chunks, callback) {
    if (this.#destroyed) {
      callback(new Error('Stream has been destroyed'));
      return;
    }

    if (this.#fd === null) {
      this.once('open', () => this._writev(chunks, callback));
      return;
    }

    const vfd = this.#getVirtualFd();
    if (!vfd) {
      callback(this.#createBadFdError());
      return;
    }

    try {
      // Combine all chunks into one buffer for efficiency
      const buffers = chunks.map(({ chunk, encoding }) =>
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
      );
      const combined = Buffer.concat(buffers);

      const writePos = this.#pos;
      const bytesWritten = vfd.entry.writeSync(combined, 0, combined.length, writePos);

      if (this.#pos !== null) {
        this.#pos += bytesWritten;
      }

      this.emit('bytes-written', bytesWritten);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Implements the writable _final method.
   * Called before 'finish' event.
   * @param {Function} callback Callback when finalization completes
   */
  _final(callback) {
    if (this.#autoClose) {
      this.#close((err) => {
        callback(err);
      });
    } else {
      callback();
    }
  }

  /**
   * Implements the writable _destroy method.
   * @param {Error|null} err The error if any
   * @param {Function} callback Callback when destroy completes
   */
  _destroy(err, callback) {
    this.#destroyed = true;

    if (this.#autoClose) {
      this.#close((closeErr) => {
        callback(err || closeErr);
      });
    } else {
      callback(err);
    }
  }

  /**
   * Closes the file descriptor.
   * @param {Function} callback Callback when close completes
   */
  #close(callback) {
    if (this.#fd === null) {
      callback();
      return;
    }

    const fd = this.#fd;
    this.#fd = null;

    try {
      this.#vfs.closeSync(fd);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Creates an EBADF error.
   * @returns {Error}
   */
  #createBadFdError() {
    const err = new Error('EBADF: bad file descriptor, write');
    err.code = 'EBADF';
    err.syscall = 'write';
    return err;
  }
}

/**
 * Creates a writable stream for a virtual file.
 * @param {VirtualFileSystem} vfs The VFS instance
 * @param {string} filePath The path to the file
 * @param {object} [options] Stream options
 * @returns {VirtualWriteStream}
 */
function createVirtualWriteStream(vfs, filePath, options = {}) {
  return new VirtualWriteStream(vfs, filePath, options);
}

module.exports = {
  VirtualWriteStream,
  createVirtualWriteStream,
};
