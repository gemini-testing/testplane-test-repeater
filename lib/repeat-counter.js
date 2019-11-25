'use strict';

const {logger} = require('./utils');

module.exports = class RepeatCounter {
    static create() {
        return new this();
    }

    constructor() {
        this._repeatCounter = new Map();
    }

    addTest(test, repeatCount) {
        this._repeatCounter.set(getTestId(test), repeatCount);
    }

    testExecuted(test) {
        const testId = getTestId(test);
        const repeatsLeft = this._repeatCounter.get(testId);

        if (repeatsLeft > 0) {
            logger.info(`Will be repeated. Repeats left: ${repeatsLeft}`);
        }

        this._repeatCounter.set(testId, repeatsLeft - 1);
    }

    getRepeatsLeft(test) {
        return this._repeatCounter.get(getTestId(test));
    }
};

function getTestId(test) {
    return `${test.id}/${test.browserId}`;
}
