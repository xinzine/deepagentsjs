'use strict';

// Shim for Node.js internal test common module

// Track pending mustCall callbacks
const pendingCallbacks = new Map();
let callbackId = 0;

// Promise that resolves when all pending callbacks are called (or times out)
let resolveAllPending = null;
let pendingPromise = null;

function checkAllResolved() {
  if (resolveAllPending && pendingCallbacks.size === 0) {
    resolveAllPending();
    resolveAllPending = null;
    pendingPromise = null;
  }
}

function mustCall(fn, count = 1) {
  if (typeof fn !== 'function') {
    count = fn || 1;
    fn = () => {};
  }

  const id = ++callbackId;
  let remaining = count;

  // Register this callback as pending
  pendingCallbacks.set(id, { expected: count, remaining, fn });

  const wrapper = (...args) => {
    remaining--;
    const entry = pendingCallbacks.get(id);
    if (entry) {
      entry.remaining = remaining;
      if (remaining <= 0) {
        pendingCallbacks.delete(id);
        checkAllResolved();
      }
    }
    return fn(...args);
  };

  return wrapper;
}

function mustNotCall(msg) {
  return () => {
    throw new Error(msg || 'mustNotCall was called');
  };
}

function mustSucceed(fn) {
  return (err, ...args) => {
    if (err) {
      throw err;
    }
    if (fn) {
      return fn(...args);
    }
  };
}

/**
 * Wait for all pending mustCall callbacks with a timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{success: boolean, pending: Array}>}
 */
function waitForPending(timeout = 5000) {
  if (pendingCallbacks.size === 0) {
    return Promise.resolve({ success: true, pending: [] });
  }

  return new Promise((resolve) => {
    pendingPromise = new Promise((res) => {
      resolveAllPending = res;
    });

    const timeoutId = setTimeout(() => {
      const pending = [];
      for (const [id, entry] of pendingCallbacks) {
        pending.push({
          id,
          expected: entry.expected,
          remaining: entry.remaining,
        });
      }
      resolve({ success: false, pending });
    }, timeout);

    pendingPromise.then(() => {
      clearTimeout(timeoutId);
      resolve({ success: true, pending: [] });
    });
  });
}

// Track expected warnings
const expectedWarnings = new Map();

/**
 * Set up expectation for process warnings
 * @param {string} type - Warning type (e.g., 'ExperimentalWarning')
 * @param {string|string[]} messages - Expected warning message(s)
 */
function expectWarning(type, messages) {
  if (typeof messages === 'string') {
    messages = [messages];
  }

  if (!expectedWarnings.has(type)) {
    expectedWarnings.set(type, new Set());
  }

  const typeSet = expectedWarnings.get(type);
  for (const msg of messages) {
    typeSet.add(msg);
  }

  // Set up warning listener if not already done
  if (!expectWarning._listenerAdded) {
    expectWarning._listenerAdded = true;
    process.on('warning', (warning) => {
      const type = warning.name;
      const message = warning.message;

      if (expectedWarnings.has(type)) {
        const typeSet = expectedWarnings.get(type);
        if (typeSet.has(message)) {
          typeSet.delete(message);
          if (typeSet.size === 0) {
            expectedWarnings.delete(type);
          }
          return; // Expected warning, don't throw
        }
      }
      // Unexpected warning - could throw, but for now just ignore
    });
  }
}
expectWarning._listenerAdded = false;

/**
 * Reset state between tests
 */
function reset() {
  pendingCallbacks.clear();
  callbackId = 0;
  resolveAllPending = null;
  pendingPromise = null;
  expectedWarnings.clear();
  expectWarning._listenerAdded = false;
}

/**
 * Get count of pending callbacks
 */
function getPendingCount() {
  return pendingCallbacks.size;
}

module.exports = {
  mustCall,
  mustNotCall,
  mustSucceed,
  expectWarning,
  waitForPending,
  reset,
  getPendingCount,
};
