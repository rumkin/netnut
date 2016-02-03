var ssh2 = require('ssh2');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var chalk = require('chalk');

var server = new ssh2.Server({
    privateKey: fs.readFileSync('key'),
    passphrase: 'password',
}, (client) => {
    client.on('authentication', (ctx) => {
        if (
            ctx.method === 'password'
            && ctx.username === 'test'
            && ctx.password === 'test'
        ) {
            ctx.accept();
        } else {
            ctx.reject();
        }
    })
    .on('ready', () => {
        // Authenticated
        client.on('session', (accept, reject) => {
            var session = accept();

            session.on('exec', (accept, reject, info) => {
                var channel = accept();

                console.log(chalk.grey(info.command));

                var child = exec(info.command);

                child.stdout.pipe(channel);
                child.stderr.pipe(channel.stderr);
                child.on('close', code => channel.exit(code));
            });
        });
    });
});

server.listen(2222, '127.0.0.1', () => console.log('Listening 2222'));

var args = process.argv.slice(2);

if (! args.length) {
    args = ['--host=test', '--role=test', '--book=initialize', '--task=test-env', '--debug'];
}

var child = spawn('node', ['../netnut.js', ...args], {
    stdio: 'inherit'
});

child.on('close', () => {
    server.close();
});
