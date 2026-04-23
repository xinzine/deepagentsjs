'use strict';

const common = require('../common');
const assert = require('assert');
const vfs = require('node:vfs');

// Test basic createWriteStream
{
  const myVfs = vfs.create();
  myVfs.mkdirSync('/test', { recursive: true });

  const stream = myVfs.createWriteStream('/test/file.txt');

  stream.on('open', common.mustCall((fd) => {
    assert.ok(fd >= 10000);
  }));

  stream.on('ready', common.mustCall());

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/test/file.txt', 'utf8');
    assert.strictEqual(content, 'hello world');
  }));

  stream.on('close', common.mustCall());

  stream.write('hello ');
  stream.end('world');
}

// Test createWriteStream overwrites existing file
{
  const myVfs = vfs.create();
  myVfs.writeFileSync('/overwrite.txt', 'original content');

  const stream = myVfs.createWriteStream('/overwrite.txt');

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/overwrite.txt', 'utf8');
    assert.strictEqual(content, 'new content');
  }));

  stream.end('new content');
}

// Test createWriteStream with encoding
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/encoded.txt', { encoding: 'utf8' });

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/encoded.txt', 'utf8');
    assert.strictEqual(content, 'encoded string');
  }));

  stream.end('encoded string');
}

// Test createWriteStream with Buffer
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/buffer.txt');

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/buffer.txt');
    assert.ok(Buffer.isBuffer(content));
    assert.strictEqual(content.toString(), 'buffer content');
  }));

  stream.end(Buffer.from('buffer content'));
}

// Test createWriteStream with multiple writes
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/multi.txt');

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/multi.txt', 'utf8');
    assert.strictEqual(content, 'AAABBBCCC');
  }));

  stream.write('AAA');
  stream.write('BBB');
  stream.end('CCC');
}

// Test createWriteStream with append mode
{
  const myVfs = vfs.create();
  myVfs.writeFileSync('/append.txt', 'original');

  const stream = myVfs.createWriteStream('/append.txt', { flags: 'a' });

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/append.txt', 'utf8');
    assert.strictEqual(content, 'original appended');
  }));

  stream.end(' appended');
}

// Test createWriteStream path property
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/path-test.txt');
  assert.strictEqual(stream.path, '/path-test.txt');

  stream.on('finish', common.mustCall());
  stream.end('test');
}

// Test createWriteStream destroy
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/destroy.txt');

  stream.on('open', common.mustCall(() => {
    stream.destroy();
  }));

  stream.on('close', common.mustCall());
}

// Test createWriteStream error when opening directory as file
{
  const myVfs = vfs.create();
  myVfs.mkdirSync('/mydir', { recursive: true });

  // Try to write to a directory - should fail with EISDIR
  const stream = myVfs.createWriteStream('/mydir');

  stream.on('error', common.mustCall((err) => {
    assert.strictEqual(err.code, 'EISDIR');
  }));
}

// Test createWriteStream with large content
{
  const myVfs = vfs.create();
  const largeContent = 'X'.repeat(100000);

  const stream = myVfs.createWriteStream('/large.txt');

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/large.txt', 'utf8');
    assert.strictEqual(content.length, 100000);
    assert.strictEqual(content, largeContent);
  }));

  stream.end(largeContent);
}

// Test createWriteStream with small highWaterMark
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/hwm.txt', {
    highWaterMark: 4,
  });

  let bytesWritten = 0;
  stream.on('bytes-written', (n) => {
    bytesWritten += n;
  });

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/hwm.txt', 'utf8');
    assert.strictEqual(content, 'AAAABBBBCCCC');
    assert.strictEqual(bytesWritten, 12);
  }));

  stream.write('AAAA');
  stream.write('BBBB');
  stream.end('CCCC');
}

// Test createWriteStream autoClose: false
{
  const myVfs = vfs.create();

  const stream = myVfs.createWriteStream('/no-auto-close.txt', {
    autoClose: false,
  });

  stream.on('finish', common.mustCall(() => {
    // FD should still be open
    assert.ok(stream.fd !== null);

    // Manually destroy to close
    stream.destroy();
  }));

  stream.on('close', common.mustCall());

  stream.end('content');
}

// Test pipe from readable to writeStream
{
  const myVfs = vfs.create();
  const { Readable } = require('stream');

  const source = new Readable({
    read() {
      this.push('piped content');
      this.push(null);
    },
  });

  const writeStream = myVfs.createWriteStream('/piped.txt');

  writeStream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/piped.txt', 'utf8');
    assert.strictEqual(content, 'piped content');
  }));

  source.pipe(writeStream);
}

// Test createWriteStream creates file in nested directory
{
  const myVfs = vfs.create();
  myVfs.mkdirSync('/deep/nested/dir', { recursive: true });

  const stream = myVfs.createWriteStream('/deep/nested/dir/file.txt');

  stream.on('finish', common.mustCall(() => {
    assert.strictEqual(myVfs.existsSync('/deep/nested/dir/file.txt'), true);
    const content = myVfs.readFileSync('/deep/nested/dir/file.txt', 'utf8');
    assert.strictEqual(content, 'nested content');
  }));

  stream.end('nested content');
}

// Test createWriteStream with start position
{
  const myVfs = vfs.create();
  myVfs.writeFileSync('/start-pos.txt', 'XXXXXXXXXXXX'); // 12 X's

  const stream = myVfs.createWriteStream('/start-pos.txt', {
    flags: 'r+',
    start: 4,
  });

  stream.on('finish', common.mustCall(() => {
    const content = myVfs.readFileSync('/start-pos.txt', 'utf8');
    // Positions 0-3: XXXX (preserved)
    // Positions 4-8: HELLO (written)
    // Positions 9-11: XXX (preserved)
    assert.strictEqual(content, 'XXXXHELLOXXX');
  }));

  stream.end('HELLO');
}

// Test concurrent write streams to different files
{
  const myVfs = vfs.create();

  const stream1 = myVfs.createWriteStream('/concurrent1.txt');
  const stream2 = myVfs.createWriteStream('/concurrent2.txt');

  let finished = 0;
  const checkBoth = common.mustCall(() => {
    finished++;
    if (finished === 2) {
      assert.strictEqual(myVfs.readFileSync('/concurrent1.txt', 'utf8'), 'content1');
      assert.strictEqual(myVfs.readFileSync('/concurrent2.txt', 'utf8'), 'content2');
    }
  }, 2);

  stream1.on('finish', checkBoth);
  stream2.on('finish', checkBoth);

  stream1.end('content1');
  stream2.end('content2');
}
