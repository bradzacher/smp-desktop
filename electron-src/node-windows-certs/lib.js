// this code is borrowed from https://github.com/jfromaniello/node-windows-certs
// we unfortunately need a version that uses a version of the edge package that is built to work with electron.

/* eslint-disable arrow-body-style */
/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const edge = require('electron-edge');
const async = require('async');
/* eslint-enable import/no-extraneous-dependencies, import/no-unresolved */
const path = require('path');

const getCerts = edge.func(path.join(__dirname, 'get-certs.csx'));

function internalGet(options, callback) {
    const params = {
        storeName: options.storeName || '',
        storeLocation: options.storeLocation || '',
        hasStoreName: !!options.storeName,
        hasStoreLocation: !!options.storeLocation,
    };
    return getCerts(params, callback);
}

exports.get = (options, callback) => {
    if (typeof callback === 'undefined') {
        callback = true;
    }

    if (!options.storeName || !Array.isArray(options.storeName)) {
        return internalGet(options, callback);
    }

    if (callback === true) {
        return options.storeName.map(storeName => internalGet({
            storeName,
            storeLocation: options.storeLocation,
        }, true)).reduce((prev, curr) => prev.concat(curr));
    }
    return async.map(options.storeName, (storeName, done) => {
        return internalGet({
            storeName,
            storeLocation: options.storeLocation,
        }, done);
    }, (err, results) => {
        if (err) {
            return callback(err);
        }
        return callback(null, results.reduce((a, b) => a.concat(b)));
    });
};
