'use strict';

const Repeater = require('lib/repeater');

describe('Repeater', () => {
    let testplane;

    const _mkTest = (test = {}) => ({browserId: 'dafault-bro', ...test});
    const _mkTestCollection = (tests) => ({eachTest: (cb) => tests.forEach(cb)});
    const _mkRepeatCounter = () => ({addTest: sinon.stub(), testExecuted: sinon.stub()});

    beforeEach(() => {
        testplane = {addTestToRun: sinon.stub()};
    });

    afterEach(() => sinon.restore());

    describe('"repeat" method', () => {
        [
            {name: 'skipped', field: 'pending'},
            {name: 'silently skipped', field: 'silentSkip'},
            {name: 'disabled', field: 'disabled'}
        ].forEach(({name, field}) => {
            it(`should not repeat ${name} test`, () => {
                const repeatCounter = _mkRepeatCounter();
                const repeater = Repeater.create(testplane, repeatCounter, true);
                const test = _mkTest({[field]: true});
                repeater.setTestCollection(_mkTestCollection([test]));

                repeater.repeat(1);

                assert.notCalled(repeatCounter.addTest);
                assert.notCalled(testplane.addTestToRun);
            });
        });

        it('should register each test in repeat counter', () => {
            const repeatCounter = _mkRepeatCounter();
            const repeater = Repeater.create(testplane, repeatCounter, true);
            const tests = [_mkTest(), _mkTest()];
            repeater.setTestCollection(_mkTestCollection(tests));

            repeater.repeat(1);

            assert.calledTwice(repeatCounter.addTest);
            assert.calledWith(repeatCounter.addTest.firstCall, tests[0]);
            assert.calledWith(repeatCounter.addTest.secondCall, tests[1]);
        });

        it('should repeat test the specified number of repeats', () => {
            const repeater = Repeater.create(testplane, _mkRepeatCounter(), true);
            const test = _mkTest({browserId: 'yabro-1'});
            repeater.setTestCollection(_mkTestCollection([test]));

            repeater.repeat(2);

            assert.calledTwice(testplane.addTestToRun);
            assert.calledWith(testplane.addTestToRun.firstCall, test, test.browserId);
            assert.calledWith(testplane.addTestToRun.secondCall, test, test.browserId);
        });

        it('should not repeat test when parallelRepeats is false', () => {
            const repeater = Repeater.create(testplane, _mkRepeatCounter(), false);
            const test = _mkTest({browserId: 'yabro-1'});
            repeater.setTestCollection(_mkTestCollection([test]));

            repeater.repeat(2);

            assert.notCalled(testplane.addTestToRun);
        });
    });

    describe('"handleTestEnd" method', () => {
        it('should call testExecuted on repeat counter', () => {
            const repeatCounter = _mkRepeatCounter();
            const repeater = Repeater.create(testplane, repeatCounter, true);
            const test = _mkTest();

            repeater.handleTestEnd(test);

            assert.calledOnceWith(repeatCounter.testExecuted, test);
        });

        it('should add test to run when parallelRepeats is false and test has repeats left', () => {
            const repeatCounter = _mkRepeatCounter();
            repeatCounter.getRepeatsLeft = sinon.stub().returns(1);
            const repeater = Repeater.create(testplane, repeatCounter, false);
            const test = _mkTest({browserId: 'yabro-1'});

            repeater.handleTestEnd(test);

            assert.calledOnceWith(testplane.addTestToRun, test, test.browserId);
        });

        it('should not add test to run when parallelRepeats is false and test has no repeats left', () => {
            const repeatCounter = _mkRepeatCounter();
            repeatCounter.getRepeatsLeft = sinon.stub().returns(0);
            const repeater = Repeater.create(testplane, repeatCounter, false);
            const test = _mkTest();

            repeater.handleTestEnd(test);

            assert.notCalled(testplane.addTestToRun);
        });

        it('should not add test to run when parallelRepeats is true', () => {
            const repeatCounter = _mkRepeatCounter();
            repeatCounter.getRepeatsLeft = sinon.stub().returns(1);
            const repeater = Repeater.create(testplane, repeatCounter, true);
            const test = _mkTest();

            repeater.handleTestEnd(test);

            assert.notCalled(testplane.addTestToRun);
        });
    });
});
