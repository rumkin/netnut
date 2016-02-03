'use strict';

var _ = require('underscore');
var Shell = require('./shell.js');
var ssh2 = require('ssh2');
var path = require('path');

module.exports = SshShell;

function SshShell(options) {
    Shell.call(this);
    options = _.extend({}, options);

    this.cwd = options.cwd || '$HOME';
    this.env = options.env || this.env;

    this.options = options;

    if (options.privateKey) {
      if (options.privateKey === true) {
        options.privateKey = process.env.HOME + '/.ssh/id_rsa'
      } else {
        options.pivateKey = path.resolve(process.cwd(), options.privateKey);
      }
    }
}

Object.setPrototypeOf(SshShell.prototype, Shell.prototype);

SshShell.prototype.open = function () {
    if (this.conn) {
        // TODO (rumkin) Recommend to disconnect first?
        throw new Error('Connection is opened');
    }

    var conn = this.conn = new ssh2.Client();
    return new Promise((resolve, reject) => {
        conn
        .on('ready', () => {
            resolve(this);
            this.emit('opened');
        })
        .connect(_.pick(this.options, [
            'host', 'port', 'username', 'password'
        ]));
    });
};

SshShell.prototype.close = function () {
    this.conn.end();
    delete this.conn;
    return this;
};

SshShell.prototype.uploadBuffer = function (source, destination) {
    var remote = path.resolve(this.cwd, destination);

    return new Promise((resolve, reject) =>
        this.conn.sftp((error, sftp) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                sftp.writeFile(remote, source, (error) => {
                    if (error) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        })
    );
};

SshShell.prototype.uploadFile = function (source, destination) {
    var local = path.resolve(process.cwd(), source);
    var remote = path.resolve(this.cwd, destination || path.basename(source));

    return new Promise((resolve, reject) =>
        this.conn.sftp((error, sftp) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                sftp.fastPut(local, remote, (error) => {
                    if (error) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        })
    );
};

SshShell.prototype.exec = function (cmd, options) {
    options = options || {};
    var env = _.extend({}, this.env, options.env);

    if (Array.isArray(cmd)) {
        cmd = cmd.join('\n');
    }

    // Conver environment variables into shell command string
    if (this.options.stringEnv) {
        cmd = _.keys(env).map(
            k => `export ${k}=${env[k]}`
        ).concat(cmd).join('\n');
        env = {};
    }

    var cwd = options.cwd || this.cwd;

    return new Promise((resolve, reject) => {
        cmd = `cd "${cwd}"\n` + cmd;
        this.emit('exec', cmd);
        this.conn.exec(cmd, {env: env}, (error, stream) => {
            if (error) {
                reject(error);
                return;
            }

            var out = [];

            out.toString = function () {
                return this.map(item => item.chunk).join('');
            };

            stream.on('close', (code, signal) => {
                resolve({
                    cmd,
                    code,
                    signal,
                    out
                });
            });

            stream.on('data', chunk => out.push({c: 1, chunk}));
            stream.stderr.on('data', chunk => out.push({c: 2, chunk}));
        });
    });
};

SshShell.prototype.batch = function (commands, options) {
    return new Promise((resolve, reject) => {
        var stack = commands.slice();

        var loop = (result) => {
            if (! stack.length) {
                resolve(result);
                return;
            }

            this.exec(stack.shift(), options).then(loop, reject);
        }

        loop();
    });
};
