'use strict';

const {root, section, option} = require('gemini-configparser');
const defaults = require('./defaults');
const {assertBoolean, assertNonNegativeInteger, assertPositiveIntegerOrInfinity} = require('../validators');

const ENV_PREFIX = 'testplane_test_repeater_';
const CLI_PREFIX = '--test-repeater-';

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: defaults.enabled,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('enabled')
        }),
        repeat: option({
            defaultValue: defaults.repeat,
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => assertNonNegativeInteger(value, 'repeat')
        }),
        minRepeat: option({
            defaultValue: defaults.minRepeat,
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => assertNonNegativeInteger(value, 'minRepeat')
        }),
        maxRepeat: option({
            defaultValue: defaults.maxRepeat,
            parseEnv: Number,
            parseCli: Number,
            validate: (value) => assertPositiveIntegerOrInfinity(value, 'maxRepeat')
        }),
        uniqSession: option({
            defaultValue: defaults.uniqSession,
            parseEnv: JSON.parse,
            parseCli: JSON.parse,
            validate: assertBoolean('uniqSession')
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const {env, argv} = process;

    return getParser()({options, env, argv});
};
