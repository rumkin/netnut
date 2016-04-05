const assert = require('assert');
const LocalShell = require('../src/local-shell.js');

var sh = new LocalShell({
    cwd: '../tmp'
});

sh
.exec('echo "hello" > local-test')
// Download file
.then(() => sh.downloadFile('local-test', '../tmp/download-result'))
// Read result
.then(() => sh.exec('cat ../tmp/download-result'))
// Match value
.then(result => assert('hello\n' === result.io.toString()))
// Process error
.catch(error => console.error(error.stack || error.message))
// Cleanup
.then(() => sh.exec('rm local-test download-result'))
;
