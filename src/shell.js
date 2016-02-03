'use strict';

var EventEmitter = require('events').EventEmitter;

module.exports = Shell;

/**
 * Abstract shell interface.
 *
 * @param {object} options Shell options.
 */
function Shell() {
  EventEmitter.call(this);
  this.env = {};
}

Object.setPrototypeOf(Shell.prototype, EventEmitter.prototype);

/**
 * @typedef CmdOptions
 * @prop {object} [env] Environment variables.
 * @prop  {CmdOptions} object Options object.
 * @prop {string} [cwd] Shell directory.
 */

/**
 * Execute single command in shell.
 *
 * @param  {string} command Shell command.
 * @param  {CmdOptions} options Command options object.
 * @return {Promise.<*,Error>} Return promise triggered after command execution.
 */
Shell.prototype.execute = function (command, options) {
  console.error('Method not implemented yet');
};

/**
 * Execute several commands passed as array.
 *
 * @param  {string[]} commands List of command strings.
 * @param  {CmdOptions} object Options object.
 * @return {Promise}          Promise triggered when all commands are done.
 */
Shell.prototype.batch = function (commands, options) {
  console.error('Method not implemented yet');
};

/**
 * Upload file to shell's destination.
 *
 * @param  {string|Buffer} source local path.
 * @param  {string} destination remote path.
 * @return {Promise.<destination, Error>} Return result path.
 */

Shell.prototype.upload = function (source, destination) {
    if (Buffer.isBuffer(source)) {
        return this.uploadBuffer(source, destination);
    } else {
        return this.uploadFile(source, destination);
    }
};


Shell.prototype.uploadFile = function (source, destination) {
  console.error('Method not implemented yet');
};

Shell.prototype.uploadBuffer = function (source, destination) {
  console.error('Method not implemented yet');
};


/**
 * Open shell or initialize local shell.
 *
 * @return {Promise} Retun promise resolved when connection is established.
 */
Shell.prototype.open = function () {
    console.error('Method not implemented yet');
};

Shell.prototype.set = function (name, value) {
    if (typeof name === 'object') {
        Object.getOwnPropertyNames(name).forEach(key => {
            this.env[key.toUpperCase()] = name[key];
        });
    } else {
        this.env[name.toUpperCase()] = value;
    }
};

Shell.prototype.get = function (name) {
    return this.env[name.toUpperCase()];
};
