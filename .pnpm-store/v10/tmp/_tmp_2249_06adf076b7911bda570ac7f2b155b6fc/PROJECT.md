# node-vfs-polyfill

Make a user-land implementation of this PR request to node core
https://github.com/nodejs/node/pull/61478

- Implement a robust monkey-patcher for the internal `fs` module's functions
- Implement/copy-from PR the main module
- SEA is out of scope, but provide the base class for VFSes and the in-memory FS
  - Out of scope, but one should be able to implement NFS or WebDav mounts this way
- Implement a robust test suite
