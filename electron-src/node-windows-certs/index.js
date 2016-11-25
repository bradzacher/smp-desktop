// loads the trusted root certs from the cert store
const certLoader = require('./lib');
const https = require('https');

const prom = new Promise((resolve, reject) => {
    certLoader.get({
        storeName: 'Root',
        storeLocation: 'LocalMachine',
    }, (err, certs) => {
        if (err) {
            reject(err);
        } else {
            // add all of the CA certs to the global cert store
            const opts = https.globalAgent.options;
            opts.ca = opts.ca || [];
            const ca = opts.ca;
            certs.map(c => ca.push(c.pem));
            resolve();
        }
    });
});

module.exports = prom;
