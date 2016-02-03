var glob = require('glob');
var argentum = require('argentum');
var Netnut = require('./src/netnut.js');
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
    books: globload('playbooks'),
    roles: globload('roles'),
    hosts: globload('hosts'),
    tasks: globload('tasks'),
};

var netnut = new Netnut(options);

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
