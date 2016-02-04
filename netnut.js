#!/usr/bin/env node

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

var options = {
    debug: args.debug,
    books: globload('books'),
    roles: globload('roles'),
    hosts: globload('hosts'),
    tasks: globload('tasks'),
};

var netnut = new Netnut(options);

var plugins = [];
var root = lookup.sync(__dirname, 'package.json');
if (root) {
    var pack = require(root);

    if (pack.config
        && pack.config.netnut
        && pack.config.netnut.plugins
        && Array.isArray(pack.config.netnut.plugins)) {

        pack.config.netnut.plugins.forEach(plugin => {
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

    mod(netnut, args);
});

netnut.run(
    args.host,
    args.role,
    args.book,
    args.task
).then(() => {
    console.log('OK')
}, (error) => {
    console.error(error.stack);
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
