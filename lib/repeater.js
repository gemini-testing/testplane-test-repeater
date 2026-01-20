'use strict';

module.exports = class TestRepeater {
    static create(...args) {
        return new this(...args);
    }

    constructor(testplane, repeatCounter, parallelRepeats) {
        this._parallelRepeats = parallelRepeats;
        this._testplane = testplane;
        this._repeatCounter = repeatCounter;
        this._tests = null;
    }

    setTestCollection(testCollection) {
        this._tests = testCollection;
    }

    repeat(repeatCount) {
        this._tests.eachTest((test) => {
            if (!shouldRepeatTest(test)) {
                return;
            }

            this._repeatCounter.addTest(test, repeatCount);

            if (this._parallelRepeats) {
                for (let i = 0; i < repeatCount; i++) {
                    this._testplane.addTestToRun(test, test.browserId);
                }
            }
        });
    }

    handleTestEnd(test) {
        this._repeatCounter.testExecuted(test);

        // In parallel mode, we always have 1 (initial run) + repeats test runs. We have + 1 here to account for that initial run
        if (!this._parallelRepeats && this._repeatCounter.getRepeatsLeft(test) + 1 > 0) {
            this._testplane.addTestToRun(test, test.browserId);
        }
    }
};

function shouldRepeatTest(test) {
    return !(test.pending || test.silentSkip || test.disabled);
}
