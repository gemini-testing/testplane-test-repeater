'use strict';

module.exports = class TestRepeater {
    static create(...args) {
        return new this(...args);
    }

    constructor(hermione, repeatCounter) {
        this._hermione = hermione;
        this._repeatCounter = repeatCounter;
        this._tests = null;
    }

    setTestCollection(testCollection) {
        this._tests = testCollection;
    }

    repeat(repeatCount) {
        this._tests.eachTest((test) => {
            if (test.pending || test.silentSkip) {
                return;
            }

            this._repeatCounter.addTest(test, repeatCount);

            for (let i = 0; i < repeatCount; i++) {
                this._hermione.addTestToRun(test, test.browserId);
            }
        });
    }
};
