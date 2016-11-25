const { EventLogger } = require('node-windows');
// read config
const config = require('../config.json');

const loggerInstance = new EventLogger(`SMP-DESKTOP-WRAPPER-${config.env}`);

function inputToString(input) {
    if (input instanceof Error) {
        return JSON.stringify({
            message: input.message,
            stack: input.stack,
            name: input.name,
        });
    } else if (typeof input !== typeof 'string') {
        return JSON.stringify(input);
    }

    return input;
}

function log(type, message, code) {
    const msgStr = inputToString(message);
    console[type](msgStr);
    loggerInstance[type](msgStr, code);
}

// wrap the logger up so it also logs to the console
module.exports = {
    loggerInstance,

    error(message, code = 2723) {
        log('error', message, code);
    },

    info(message, code = 2723) {
        log('info', message, code);
    },

    warn(message, code = 2723) {
        log('warn', message, code);
    },
};
