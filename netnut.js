#!/usr/bin/env node

'use strict';

var glob = require('glob');
var argentum = require('argentum');
var Netnut = require('./src/netnut.js');
var lookup = require('./lib/lookup.js');
var path = require('path');
var yaml = require('yamljs');

var args = argentum.parse(process.argv.slice(2));

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

var basedir = args.dir || process.cwd();
var options = {
    debug: args.debug,
    books: globload(path.join(basedir,'books')),
    roles: globload(path.join(basedir,'roles')),
    hosts: globload(path.join(basedir,'hosts')),
    tasks: globload(path.join(basedir,'tasks')),
};

var netnut = new Netnut(options);

var plugins = [];
var root = lookup.sync(process.cwd(), 'package.json');
if (root) {
    let pack = require(root);
    let dir = path.dirname(root);

    if (pack.config
        && pack.config.netnut
        && pack.config.netnut.plugins
        && Array.isArray(pack.config.netnut.plugins)) {

        pack.config.netnut.plugins.forEach(plugin => {
            if (plugin.includes(path.sep)) {
                plugin = path.resolve(dir, plugin);
            }

            if (!~plugins.indexOf(plugin)) {
                plugins.push(plugin);
            }
        });
    }
}

if (Array.isArray(args.plugins)) {
    args.plugins.forEach(plugin => {
        if (!~plugins.indexOf(plugin)) {
            plugins.push(plugin);
        }
    });
}

plugins.forEach(plugin => {
    var mod;
    if (plugin.includes('/')) {
        mod = require(path.resolve(plugin));
    } else {
        mod = require(plugin);
    }

    mod.call(netnut, netnut, args);
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
        configs[name] = yaml.load(path.join(dir, config));
    });

    return configs;
}
