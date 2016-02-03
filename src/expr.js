'use strict';

var parser = require('./parser.js');

module.exports.Compiler = Compiler;
module.exports.Parser = parser;

function Compiler() {
  this.filters = {};
}

Compiler.prototype.compile = function (str) {
  var ast = parser.parse(str);

  return (values) => {
    var ctx = values || {};
    return ast.map(ast => {
      if (typeof ast === 'string') {
        return ast;
      }

      var expr = ast.expr;

      var target = this.value(ctx, expr.value);

      target = this.filtrate(ctx, target, expr.filters);

      return target;
    }).join('');
  };
};

Compiler.prototype.eval = function (pattern, values) {
  return this.compile(pattern)(values);
};

Compiler.prototype.extract = extract;
Compiler.prototype.interpolate = interpolate;
Compiler.prototype.value = value;

Compiler.prototype.filtrate = function (ctx, value, token) {
  return filtrate(ctx, value, token, this.filters);
};

function extract(ctx, variable) {
  if (typeof ctx !== 'object') {
    return;
  }
  var varname = variable.name;
  var path = variable.path;

  if (ctx.hasOwnProperty(varname)) {
    ctx = ctx[varname];
  } else {
    return;
  }

  var i = -1;
  var l = path.length;
  while(++i < l) {
    let prop = path[i];
    let val = prop.value;

    switch(prop.type) {
      case 'property':
        if (! ctx.hasOwnProperty(val)) {
          return;
        }
        ctx = ctx[val];
      break;
      case 'index':
        let index = interpolate(ctx, val);
        if (! ctx.hasOwnProperty(index)) {
          return;
        }
        ctx = ctx[index];
      break;
    }

    if (i < l - 1 && typeof ctx !== 'object') {
      return;
    }
  }

  return ctx;
}

function interpolate(ctx, token) {
  switch(token.type) {
    case 'bool':
      return token.value === 'true';
    case 'float':
      return parseFloat(token.value);
    case 'integer':
      return parseInt(token.value);
    default:
      return token.value;
  }
}

function value(ctx, token) {
  if (token.type === 'variable') {
    return extract(ctx, token);
  } else {
    return interpolate(ctx, token);
  }
}

function filtrate(ctx, val, token, filters) {
  var i = -1;
  var l = token.length;

  while (++i < l) {
    let filter = token[i];
    let fname = filter.name;
    if (! filters.hasOwnProperty(fname) || typeof filters[fname] !== 'function') {
      throw new Error(`Filter ${fname} is not defined`);
    }
    val = filters[fname].apply(ctx, [val].concat(filter.args.map(
      arg => value(ctx, arg)
    )));
  }

  return val;
}
