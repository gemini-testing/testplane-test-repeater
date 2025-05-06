'use strict';

const {logger} = require('./utils');

module.exports = class RepeatCounter {
    static create(...args) {
        return new this(...args);
    }

    constructor(testplane, parallelRepeats) {
        this._parallelRepeats = parallelRepeats;
        this._testplane = testplane;
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
            if (!this._parallelRepeats) {
                this._testplane.addTestToRun(test, test.browserId);
            }
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
