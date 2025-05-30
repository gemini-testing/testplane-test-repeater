'use strict';

const RepeatCounter = require('lib/repeat-counter');
const {logger} = require('lib/utils');

describe('RepeatCounter', () => {
    let repeatCounter;

    const _mkTest = ({id = '100500', browserId = 'default-bro'} = {}) => ({id, browserId});

    beforeEach(() => {
        repeatCounter = RepeatCounter.create();
        sinon.stub(logger, 'info');
    });

    afterEach(() => sinon.restore());

    describe('"testExecuted" method', () => {
        it('should not inform that test will be repeated if repeats is no more left', () => {
            const test = _mkTest({id: '1', browserId: 'yabro'});

            repeatCounter.addTest(test, 0);
            repeatCounter.testExecuted(test);

            assert.notCalled(logger.info);
        });

        it('should inform that test will be repeated', () => {
            const test = _mkTest({id: '1', browserId: 'yabro'});

            repeatCounter.addTest(test, 1);
            repeatCounter.testExecuted(test);

            assert.calledOnceWith(logger.info, 'Will be repeated. Repeats left: 1');
        });

        it('should decrement repeat count of test', () => {
            const test = _mkTest({id: '1', browserId: 'yabro'});
            repeatCounter.addTest(test, 1);
            repeatCounter.testExecuted(test);

            const repeatsLeft = repeatCounter.getRepeatsLeft(test);

            assert.equal(repeatsLeft, 0);
        });
    });

    describe('"repeatsLeft" method', () => {
        it('should return current repeat count of test', () => {
            const test = _mkTest({id: '1', browserId: 'yabro'});
            repeatCounter.addTest(test, 1);

            const repeatsLeft = repeatCounter.getRepeatsLeft(test);

            assert.equal(repeatsLeft, 1);
        });
    });
});
