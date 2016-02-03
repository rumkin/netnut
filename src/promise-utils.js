'use strict';

// module.exports = Promise;

// var Hippo = Promise;
// function Hippo(fn) {
//     Promise.call(this, ...arguments);
// }
//
// Hippo.all = Promise.all;
// Hippo.resolve = Promise.resolve;
// Hippo.empty = function(fulfil) {
//     return Promise.resolve().then(fulfil);
// };

// Object.setPrototypeOf(Hippo.prototype, Promise.prototype);

Promise.prototype.spread = function (fulfil, failure) {
    return this.then(result => fulfil(...result), failure);
};
