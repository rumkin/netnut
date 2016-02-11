#!/usr/bin/env node

'use strict';

var glob = require('glob');
var argentum = require('argentum');
var Netnut = require('./src/netnut.js');
var lookup = require('./lib/lookup.js');
var path = require('path');
var yaml = require('yamljs');
var chalk = require('chalk');
var _ = require('underscore');

var args = argentum.parse(process.argv.slice(2));

// Output version on --version
if (args.v || args.version) {
    console.log(require(path.join(__dirname, 'package.json')).version);
    return;
}

args = Object.assign({
    debug: false,
    role: 'test',
    task: 'main'
}, args);

var context = {};
if (Array.isArray(args.context)) {
    args.context.forEach(pair => {
        if (! pair.includes('=')) {
            context[pair] = true;
        } else {
            let match = pair.match(/^\s*(.+?)\s*=\s*?(.*?)\s*$/);
            if (match) {
                context[match[1]] = match[2];
            }
        }
    });
}

// Dir resolve order (higher number higher priority):
//
// 1. netnut in cwd
// 2. config.netnut.dir in package.json
// 3. environment variable
// 4. argv --dir

var basedir = args.dir || process.env.NETNUT_PATH;

// Load plugins

var plugins = [];
var root = lookup.sync(process.cwd(), 'package.json');
if (root) {
    let pack = require(root);
    let dir = path.dirname(root);

    if (pack.config && pack.config.netnut){
        let config = pack.config.netnut;

        if (config.dir) {
            basedir = basedir || path.resolve(dir, config.dir);
        }

        if (config.plugins && Array.isArray(config.plugins)) {
            config.plugins.forEach(plugin => {
                if (plugin.startsWith('./')) {
                    plugin = path.resolve(dir, plugin);
                }

                if (!~plugins.indexOf(plugin)) {
                    plugins.push(plugin);
                }
            });
        }
    }
}

if (Array.isArray(args.plugins)) {
    args.plugins.forEach(plugin => {
        if (!~plugins.indexOf(plugin)) {
            if (plugin.statsWith('./')) {
                plugin = path.resolve(plugin);
            }
            plugins.push(plugin);
        }
    });
}

basedir = basedir || path.join(process.cwd(), 'netnut');

var options = {
    debug: args.debug,
    books: globload(path.join(basedir,'books')),
    roles: globload(path.join(basedir,'roles')),
    hosts: globload(path.join(basedir,'hosts')),
    tasks: globload(path.join(basedir,'tasks')),
};

if (options.debug) {
    info('Basedir', basedir);
    infolist('Books', _.keys(options.books));
    infolist('Roles', _.keys(options.roles));
    infolist('Hosts', _.keys(options.hosts));
}

var netnut = new Netnut(options);

plugins.forEach(plugin => {
    var ext = require(plugin);

    if (typeof ext !== 'function') {
        throw new Error(`Plugin ${plugin} is not a function.`);
    }

    ext.call(netnut, netnut, args);
});

netnut.run(
    args.host,
    args.role,
    args.book,
    args.task,
    context
).then(() => {
    console.log('OK')
}, (error) => {
    console.error(args.debug
            ? error.stack
            : error.message
        );
})
.then(() => netnut.stop());

function globload(dir) {
    var configs = {};

    glob.sync('*.yml', {
        cwd: dir
    }).forEach(config => {
        var name = config.slice(0, -4).replace(/-+/, '_');
        var filepath = path.join(dir, config);
        if (args.debug) {
            info('Read', filepath);
        }
        configs[name] = yaml.load(filepath);
    });

    return configs;
}

function info(label, value) {
    label = chalk.grey(label) + ':';
    return console.log(label, value);
}

function infolist(label, value) {
    label = chalk.grey(label) + ':\n\t- %s';
    return console.log(label, value.join('\n\t- '));
}
