'use strict';

module.exports = function (netnut, args) {
    netnut.setCommand('log', function(value, action) {
        console.log(this.eval(value));
    });
};
