var spawn = require('child_process').spawnSync;
var LocalShell = require('../src/local-shell.js');

var sh = new LocalShell({
    cwd: '/tmp'
});

sh.open().then(() =>
    sh.upload('./local-shell.js')
)
.then(() =>
    sh.upload(new Buffer(String(new Date)), 'jstime').then(() =>
        sh.exec('cat jstime').then(cmd => console.log('' + cmd.out))
    )
)
.then(
    () => sh.exec(`
    set -e

    # if [ ! -d "test" ]; then
        mkdir test
    # fi

    cd test
    echo $(date) > time
    `).then(cmd => console.log('%s %s', cmd.code, cmd.out))
)
.catch(
    error => console.error(error)
);
