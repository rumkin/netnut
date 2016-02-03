'use strict';

// var inspect = require('util').inspect;
var candy = require('./candy.js');
var yaml = require('yamljs');
var pify = require('pify');
var prompt = require('prompt');

var LocalShell = require('./src/local-shell.js');
var SshShell = require('./src/ssh-shell.js');

var compiler = new candy.Compiler();

compiler.filters.upper = function (value) {
  return String(value).toUpperCase();
};

compiler.filters.add = function (value, right) {
  return value + right;
};

compiler.filters.dump = function (value) {

  console.log(typeof value, ':', value);

  return value;
};


var ctx = {
  user: 'groot',
  os: 'linux',
  dist: 'ubuntu',
  users: [
    {name: 'alice'},
    {name: 'bob'},
  ]
};

var execSync = require('child_process').execSync;

var commands = {
  set: function(value, ctx) {
    var value_ = value.split(/\s*=\s*/);

    if (value_.length) {
      ctx[value_[0]] = value_[1];
      this.sh.remote.set(this.prefix + '_' + value_[0], value_[1]);
    }
  },
  echo: function (text, ctx) {
    console.log(text);
  },
  sh: function (cmd, ctx) {
    return this.sh.remote.exec(cmd).then(result => {
        process.stdout.write('' + result.out)
    })
  },
  read: function(text, ctx) {
    var parts = text.split('=');

    return pify(prompt).get(parts[1]).then(value => {
      ctx[parts[0]] = value[parts[1]];
      this.sh.remote.set(this.prefix + '_' + parts[0], value[parts[1]]);

      if (value[parts[1]] === 'err') {
        throw new Error('Name is err');
      }
    });
  }
};

function exec(file, self, ctx, commands) {
  var script = yaml.load(file);

  var shortcuts = [
    [/^>\s/, 'echo'],
    [/^\$\s/, 'sh']
  ];

  var queue = script.commands.slice(0);


  function loop(err, result) {
    if (err) {
      throw err;
    }

    if (! queue.length) {
      return result;
    }

    var cmdResult = executeCommand(queue.shift());

    if (! (cmdResult instanceof Promise)) {
      cmdResult = Promise.resolve(cmdResult);
    }

    return cmdResult.then(loop.bind(null, null), loop);
  }

  function executeCommand(cmd) {
    if (typeof cmd === 'string') {
      let i = -1;
      let l = shortcuts.length;
      while (++i < l) {
        let shortcut = shortcuts[i];
        let match = cmd.match(shortcut[0]);
        if (match) {
          let evaluated = compiler.eval(cmd.slice(match[0].length), ctx);
          return commands[shortcut[1]].call(self, evaluated, ctx);
        }
      }

      throw new Error('Unknown command');

    } else {
        var keys = Object.getOwnPropertyNames(cmd);
        while (keys.length) {
            let key = keys.shift();

            if (key in commands) {
                return commands[key].call(self, compiler.eval(cmd[key], ctx), ctx);
            }
        }
        
        throw new Error(`Unknown command ${key}.`);
    }
  }

  return new Promise((resolve, reject) => {
    loop().then(resolve, reject);
  });
}

var local = new LocalShell();
var remote = new SshShell({
    host: '78.47.172.45',
    port: 22,
    username: 'hyphen',
    password: 'DkhtDkjh597Y',
    cwd: '/tmp',
    stringEnv: true
})

Promise.all([
    local.open(),
    remote.open(),
]).then(shells => {
    var self = {
        prefix: 'ACME',
        sh: {
            local,
            remote
        }
    };

    return exec('cmd.yml', self, Object.assign({}, ctx), commands)
})
.then(
    () => console.log('OK'),
    error => console.error(error + '')
)
.then(() => {
    local.close();
    remote.close();
});
