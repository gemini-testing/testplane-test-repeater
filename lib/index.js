'use strict';

const parseConfig = require('./config');
const RepeatCounter = require('./repeat-counter');
const Repeater = require('./repeater');
const {assertNonNegativeInteger} = require('./validators');
const {logger} = require('./utils');

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);
    let cliTool;

    if (!pluginConfig.enabled || hermione.isWorker()) {
        return;
    }

    hermione.on(hermione.events.CLI, (cli) => {
        cliTool = cli;
        cli.option(
            '--repeat <number>',
            'how many times tests should be repeated regardless of the result',
            (value) => parseNonNegativeInteger(value, 'repeat')
        );
    });

    hermione.on(hermione.events.INIT, () => {
        const repeat = cliTool.repeat || pluginConfig.repeat;

        if (!repeat) {
            return;
        }

        resetRetries(hermione);

        const repeatCounter = RepeatCounter.create();
        const repeater = Repeater.create(hermione, repeatCounter);
        const repeatCount = limitRepeatCount(repeat, pluginConfig.minRepeat, pluginConfig.maxRepeat);

        hermione.on(hermione.events.AFTER_TESTS_READ, (testCollection) => {
            repeater.setTestCollection(testCollection);
        });

        hermione.on(hermione.events.RUNNER_START, () => {
            repeater.repeat(repeatCount);
        });

        hermione.on(hermione.events.TEST_PASS, (test) => repeatCounter.testExecuted(test));
        hermione.on(hermione.events.RETRY, (test) => repeatCounter.testExecuted(test));

        hermione.intercept(hermione.events.TEST_FAIL, ({event, data}) => {
            const repeatsLeft = repeatCounter.getRepeatsLeft(data);

            return repeatsLeft > 0
                ? {event: hermione.events.RETRY, data: Object.assign(data, {retriesLeft: repeatsLeft})}
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

function resetRetries(hermione) {
    hermione.config.getBrowserIds().forEach((browserId) => {
        const browserConfig = hermione.config.forBrowser(browserId);
        browserConfig.retry = 0;
    });
}
