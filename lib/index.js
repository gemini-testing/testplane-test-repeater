'use strict';

const parseConfig = require('./config');
const RepeatCounter = require('./repeat-counter');
const Repeater = require('./repeater');
const {assertNonNegativeInteger} = require('./validators');
const {logger} = require('./utils');

module.exports = (testplane, opts) => {
    const pluginConfig = parseConfig(opts);
    let cliTool;

    if (!pluginConfig.enabled || testplane.isWorker()) {
        return;
    }

    testplane.on(testplane.events.CLI, (cli) => {
        cliTool = cli;
        cli.option(
            '--repeat <number>',
            'how many times tests should be repeated regardless of the result',
            (value) => parseNonNegativeInteger(value, 'repeat')
        );
    });

    testplane.on(testplane.events.INIT, () => {
        const repeat = cliTool && cliTool.repeat || pluginConfig.repeat;

        if (!repeat) {
            return;
        }

        resetBrowserConfig(testplane, pluginConfig);

        const repeatCounter = RepeatCounter.create();
        const repeater = Repeater.create(testplane, repeatCounter, pluginConfig.parallelRepeats);
        const repeatCount = limitRepeatCount(repeat, pluginConfig.minRepeat, pluginConfig.maxRepeat);

        testplane.on(testplane.events.AFTER_TESTS_READ, (testCollection) => {
            repeater.setTestCollection(testCollection);
        });

        testplane.on(testplane.events.BEGIN, () => {
            repeater.repeat(repeatCount);
        });

        testplane.on(testplane.events.TEST_PASS, (test) => repeater.handleTestEnd(test));
        testplane.on(testplane.events.RETRY, (test) => repeater.handleTestEnd(test));

        testplane.intercept(testplane.events.TEST_FAIL, ({event, data}) => {
            const repeatsLeft = repeatCounter.getRepeatsLeft(data);

            return repeatsLeft > 0
                ? {event: testplane.events.RETRY, data: Object.assign(data, {retriesLeft: repeatsLeft})}
                : {event, data};
        });
    });
};

function parseNonNegativeInteger(value, name) {
    const parsedValue = parseInt(value);

    assertNonNegativeInteger(parsedValue, name);

    return parsedValue;
}

function limitRepeatCount(repeat, minRepeat, maxRepeat) {
    const limitedRepeat = Math.min(Math.max(repeat, minRepeat), maxRepeat);

    if (limitedRepeat !== repeat) {
        logger.info(
            `repeat count was changed from ${repeat} to ${limitedRepeat} ` +
            `because it should be in range of ${minRepeat} - ${maxRepeat}`
        );
    }

    return limitedRepeat;
}

function resetBrowserConfig(testplane, {uniqSession}) {
    testplane.config.getBrowserIds().forEach((browserId) => {
        const browserConfig = testplane.config.forBrowser(browserId);
        browserConfig.retry = 0;

        if (uniqSession) {
            browserConfig.testsPerSession = 1;
        }
    });
}
