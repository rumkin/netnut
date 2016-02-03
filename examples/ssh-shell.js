var spawn = require('child_process').spawnSync;
var SshShell = require('../src/ssh-shell.js');

var sh = new SshShell({
    host: '127.0.0.1',
    username: 'ubuntu',
    password: 'ubuntu',
    port: 22,
    cwd: '/tmp'
});

sh.open()
// .then(() => sh.upload('./local-shell.js'))
.then(() => sh.exec('ls -la .').then(cmd => console.log('%s', cmd.out)))
.then(() => sh.upload(new Buffer(String(new Date)), 'jstime').then(() =>
    sh.exec('cat jstime').then(cmd => console.log('' + cmd.out))
))
.then(() => sh.exec(
`
    set -e
    if [ ! -d test ]; then
        mkdir test
    fi

    cd test
    echo $(date) > time
`
).then(cmd => console.log('%s', cmd.out)))
// .then(() => sh.batch(['mkdir test', 'echo "hello" > test/file', 'cat test/file'])
//     .then(cmd => console.log('%s', cmd.out))
// )
.then(() => console.log('OK'))
.catch(
    error => console.error(error)
)
.then(() => sh.close());
