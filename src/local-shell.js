'use strict';

var Shell = require('./shell.js');
var fs = require('fs');
var path = require('path');
var childprocess = require('child_process');
var _ = require('underscore');
const IOString = require('./io-string.js');

module.exports = LocalShell;

function LocalShell(options) {
    Shell.call(this);

    options = options || {};
    this.env = options.env || this.env;
    this.cwd = options.cwd || process.cwd();
}

Object.setPrototypeOf(LocalShell.prototype, Shell.prototype);

LocalShell.prototype.open = function () {
    return Promise.resolve().then(() => {
        this.emit('opened');
        return this;
    });
};

LocalShell.prototype.close = function () {
    return this;
};

LocalShell.prototype.exec = function (cmd, options) {
    options = options || {};
    var env = _.extend({}, this.env, options.env);

    if (Array.isArray(cmd)) {
        cmd = cmd.join('\n');
    }

    var cwd = options.cwd || this.cwd;

    return new Promise((resolve, reject) => {
        this.emit('exec', cmd);
        var child = childprocess.exec(cmd, {cwd, env});

        var io = [];

        io.toString = function () {
            return this.join('');
        };

        child.stdout.on('data', chunk => io.push(new IOString(chunk, 1)));
        child.stderr.on('data', chunk => io.push(new IOString(chunk, 2)));
        child.on('close', (code) => {
            resolve({code, io});
        });
    });
}

LocalShell.prototype.uploadFile = function (source, destination) {
    var local = path.resolve(process.cwd(), source);
    // FIXME (rumkin) replace basename with removing path's base.
    var remote = path.resolve(this.cwd, destination || path.basename(local));

    return new Promise((resolve, reject) => {
        fs.createReadStream(local)
        .pipe(fs.createWriteStream(remote))
        .on('finish', resolve)
        .on('error', reject)
        ;
    }).then(() => {
        this.emit('uploaded', local, remote)
    });
};

LocalShell.prototype.downloadFile = function(source, destination) {
    var local = path.resolve(this.cwd, source);
    // FIXME (rumkin) replace basename with removing path's base.
    var remote = path.resolve(process.cwd(), destination || path.basename(local));

    return new Promise((resolve, reject) => {
        fs.createReadStream(local)
        .pipe(fs.createWriteStream(remote))
        .on('finish', resolve)
        .on('error', reject)
        ;
    }).then(() => {
        this.emit('downloaded', local, remote)
    });
};

LocalShell.prototype.uploadBuffer = function(buffer, destination) {
    var remote = path.resolve(this.cwd, destination);

    return new Promise((resolve, reject) => {
        fs.createWriteStream(remote)
        .on('finish', resolve)
        .on('error', reject)
        .end(buffer)
        ;
    }).then(() => {
        this.emit('uploaded', buffer, remote);
    });
};
