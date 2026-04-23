'use strict';

// Suppress experimental warnings for cleaner test output
process.removeAllListeners('warning');

const Module = require('node:module');
const path = require('node:path');

// Path to our polyfill
const polyfillPath = path.resolve(__dirname, '../../index.js');

// Store original _load
const originalLoad = Module._load;

// Patch Module._load to intercept node:vfs
Module._load = function(request, parent, isMain) {
  if (request === 'node:vfs') {
    return originalLoad.call(this, polyfillPath, parent, isMain);
  }
  return originalLoad.call(this, request, parent, isMain);
};

// Tests that require native features our polyfill can't provide
const SKIP_TESTS = new Set([
  'test-vfs-chdir-worker.js',     // Workers need native node:vfs
  'test-vfs-mount-mode.js',       // Uses Module.registerHooks which needs native support
  'test-vfs-sea.js',              // Requires node:sea built-in module
]);

// Run tests
async function runTests() {
  const testFiles = process.argv.slice(2);

  if (testFiles.length === 0) {
    // Run all tests if none specified
    const fs = require('fs');
    const testDir = path.join(__dirname, 'test/parallel');
    const allTests = fs.readdirSync(testDir)
      .filter(f => f.startsWith('test-vfs') && f.endsWith('.js'))
      .sort();
    testFiles.push(...allTests);
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures = [];

  for (const file of testFiles) {
    const testPath = path.resolve(__dirname, 'test/parallel', file);
    process.stdout.write(`  ${file} ... `);

    if (SKIP_TESTS.has(file)) {
      console.log('⊘ (skipped - requires native node:vfs)');
      skipped++;
      continue;
    }

    // Reset common module state
    const common = require('./test/common');
    common.reset();

    // Clear require cache
    delete require.cache[testPath];

    try {
      require(testPath);

      // Wait for async callbacks
      const result = await common.waitForPending(10000);

      if (result.success) {
        console.log('✓');
        passed++;
      } else {
        console.log('✗ (pending callbacks)');
        failures.push({ file, error: `${result.pending.length} callback(s) not called` });
        failed++;
      }
    } catch (err) {
      console.log('✗');
      failures.push({ file, error: err.message, stack: err.stack });
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const { file, error, stack } of failures) {
      console.log(`\n  ${file}:`);
      console.log(`    ${error}`);
      if (stack) {
        console.log(stack.split('\n').slice(1, 4).map(l => '    ' + l).join('\n'));
      }
    }
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exitCode = 1;
});
