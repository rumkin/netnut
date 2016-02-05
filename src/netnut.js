'use strict';

var _ = require('underscore');
var yaml = require('yamljs');
var path = require('path');
var expr = require('./expr.js');
var LocalShell = require('./local-shell.js');
var SshShell = require('./ssh-shell.js');
var chalk = require('chalk');

require('./promise-utils.js');

module.exports = Netnut;

function Netnut(options_) {
    var options = options_ || {};

    this.cwd = options.cwd || process.cwd();
    this.debug = options.debug || false;
    this.prefix = options.prefix || 'CLIENT_';
    this.roles = options.roles;
    this.books = options.books;
    this.hosts = options.hosts;
    this.tasks = options.tasks || {};
    var context = {};
    _.keys(this.tasks).forEach((key) => {
        var task = this.tasks[key];

        _.extend(context, task.params);
    });

    this.commands = _.extend({}, this.commands, options.commands);
    this.context = _.extend(context, options.context);
    this.compiler = options.compiler || new expr.Compiler();
}

Netnut.LocalShell = LocalShell;
Netnut.SshShell = SshShell;

Netnut.prototype.run = function (hostName, roleName, bookName, taskName, context) {
    var host = this.getHost(hostName);
    var role = this.getRole(roleName);
    var tasks = this.getBookTask(bookName, taskName);
    var stack = [];

    var session = {
        ended: false,
        host: hostName,
        role: roleName,
        book: bookName,
        task: taskName,
        context: _.extend({}, this.context, role, context),
        stack,
        netnut: this,
        eval(value, locals) {
            locals = Object.assign({}, this.context, locals);

            return this.netnut.eval(value, locals);
        }
    };

    return Promise.all([
        this.createLocalShell().open(),
        this.createRemoteShell(host).open()
    ]).spread((local, remote) => {
        this.shells = {local, remote};

        stack.push(...tasks);

        var loop = (error) => {
            if (error) {
                session.ended = true;
                throw error;
            }

            if (! stack.length) {
                session.ended = true;
                return;
            }

            var task = stack.shift();
;
            // TODO (rumkin) Make transparent...
            if (task.label) {
                console.log(chalk.green('start'), chalk.bold(task.label));
            }

            var result = this.getTaskCommand(task, session);

            if (! (result instanceof Promise)) {
                result = Promise.resolve(result);
            }

            return result.then(() => loop(), loop);
        };

        return loop();
    })
    .then(() => this.stop());
};

Netnut.prototype.stop = function () {
    if (this.shells) {
        return Promise.all([
            this.shells.local.close(),
            this.shells.remote.close(),
        ]).then(() => {
            delete this.shells;
        })
    } else {
        return Promise.resolve();
    }
};

Netnut.prototype.createLocalShell = function (role) {
    var shell = new LocalShell(_.extend({
        cwd: this.cwd
    }));

    shell.set(this.context);
    if (this.debug) {
        shell.on('exec', (cmd) => console.error(cmd));
    }

    return shell;
};

Netnut.prototype.createRemoteShell = function (host) {
    var ctor;
    if (host.type === 'ssh') {
        ctor = SshShell;
    } else {
        ctor = LocalShell;
    }


    var shell = new ctor(_.extend({
        stringEnv: true
    }, host.connection));

    shell.set(this.context);

    if (this.debug) {
        shell.on('exec', (cmd) => console.error(cmd));
    }

    return shell;
};

Netnut.prototype.getRole = function (name) {
    if (!(name in this.roles)) {
        throw new Error(`Role ${name} not exists`);
    }

    return this.roles[name];
};

Netnut.prototype.getBookTask = function (bookName, taskName) {
    if (!(bookName in this.books)) {
        throw new Error(`Book ${bookName} not exists`);
    }

    var book = this.books[bookName];

    if (! (taskName in book)) {
        throw new Error(`Task ${taskName} not found in book ${bookName}`);
    }

    return book[taskName];
};

Netnut.prototype.getHost = function (name) {
    if (!(name in this.hosts)) {
        throw new Error(`Host ${name} not exists`);
    }

    return this.hosts[name];
};

Netnut.prototype.commands = {
    exec(value, item, session) {
        if (Array.isArray(value)) {
            return this.shells.remote.batch(value.map(value => session.eval(value)));
        } else {
            value = session.eval(value);
            return this.shells.remote.exec(value).then((result) => {
                if (this.debug) {
                    process.stdout.write(result.out + '');
                }

                if (result.code) {
                    // TODO Process error
                    throw new Error('Execution failed');
                }
            });
        }
    },
    env(value, item, session) {
        value = session.eval(value);

        var match = value.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/);

        if (! match) {
            throw new Error(`Invalid value ${value}`);
        }

        var name = match[1];
        var varname = (this.prefix + name).toUpperCase();
        var val = match[2];

        this.context[value]= value;
        this.shells.local.set(varname, val);
        this.shells.remote.set(varname, val);
    },
    upload(value, item, session) {
        var source, destination;

        if (typeof value === 'string') {
            source = session.eval(value);
        } else {
            source = session.eval(value.src);
            destination = session.eval(value.dest);
        }

        source = path.resolve(this.cwd, source);

        return this.shells.remote.upload(source, destination);
    },
    task(value, item, session) {
        value = session.eval(value);
        if (! (value in this.tasks)) {
            throw new Error(`Task ${value} not found`);
        }

        session.stack.unshift(...this.tasks[value].actions);
        return;
    }
};

Netnut.prototype.eval = function (value, locals) {
    return this.compiler.eval(value, locals);
};

Netnut.prototype.getTaskCommand = function (task, session) {
    var keys = _.keys(task);
    var i = -1;
    var l = keys.length;
    var key, command;

    while (++i < l) {
        key = keys[i];
        if (key in this.commands) {
            command = this.commands[key];

            return command.call(this, task[key], task, session);
        }
    }
};

Netnut.prototype.getCommand = function (name) {
    var command = this.findCommand(name);
    if (! command) {
        throw new Error(`Command ${name} not exists`);
    }

    return command;
};

Netnut.prototype.findCommand = function (name) {
    return this.commands[name];
};

Netnut.prototype.setCommand = function (name, value) {
    if (name in this.commands) {
        throw new Error(`Command ${name} already exists`);
    }

    if (typeof value !== 'function') {
        throw new Error('Executable is not a function');
    }

    this.commands[name] = value;
};

Netnut.prototype.setBook = function (name, value) {
    if (name in this.books) {
        throw new Error(`Book ${name} already exists`);
    }

    this.books[name] = value;
};

Netnut.prototype.setTask = function (name, value) {
    if (name in this.tasks) {
        throw new Error(`Task ${name} already exists`);
    }

    this.tasks[name] = value;
};

Netnut.prototype.setRole = function (name, value) {
    if (name in this.roles) {
        throw new Error(`Role ${name} already exists`);
    }

    this.roles[name] = value;
};

Netnut.prototype.setHost = function (name, value) {
    if (name in this.hosts) {
        throw new Error(`Host ${name} already exists`);
    }

    this.hosts[name] = value;
};
