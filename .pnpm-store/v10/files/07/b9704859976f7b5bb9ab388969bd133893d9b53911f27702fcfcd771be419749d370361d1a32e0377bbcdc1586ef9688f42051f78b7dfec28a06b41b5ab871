'use strict';

const fs = require('fs');
const path = require('path');

// Use project-relative temp directory
const tmpPath = path.join(__dirname, '../../..', '.test-mounts', 'tmpdir');

module.exports = {
  path: tmpPath,
  resolve(...args) {
    return path.join(tmpPath, ...args);
  },
  refresh() {
    // Remove existing temp directory if it exists
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { recursive: true, force: true });
    }
    // Create fresh temp directory
    fs.mkdirSync(tmpPath, { recursive: true });
  },
};
