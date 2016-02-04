var spawn = require('child_process').spawnSync;
var SshShell = require('../src/ssh-shell.js');
var argentum = require('argentum');
var path = require('path');

var opts = argentum.parse(process.argv.slice(2));

var sh = new SshShell(opts);

sh.open()
// .then(() => sh.upload('./local-shell.js'))
// .then(() => sh.exec('ls -la .').then(cmd => console.log('%s', cmd.out)))
// .then(() => sh.upload(new Buffer(String(new Date)), 'jstime').then(() =>
//     sh.exec('cat jstime').then(cmd => console.log('' + cmd.out))
// ))
.then(() => sh.exec(
`
    ls $HOME
`
).then(cmd => console.log('%s', cmd.out)))
// .then(() => sh.batch(['mkdir test', 'echo "hello" > test/file', 'cat test/file'])
//     .then(cmd => console.log('%s', cmd.out))
// )
.then(() => console.log('OK'))
.catch(
    error => {
        console.error('' + error);
        process.exit(1);
    }
)
.then(() => sh.close());
