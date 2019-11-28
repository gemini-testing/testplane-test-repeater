'use strict';

const Repeater = require('lib/repeater');

describe('Repeater', () => {
    let hermione;

    const _mkTest = (test = {}) => ({browserId: 'dafault-bro', ...test});
    const _mkTestCollection = (tests) => ({eachTest: (cb) => tests.forEach(cb)});
    const _mkRepeatCounter = () => ({addTest: sinon.stub()});

    beforeEach(() => {
        hermione = {addTestToRun: sinon.stub()};
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
                const repeater = Repeater.create(hermione, repeatCounter);
                const test = _mkTest({[field]: true});
                repeater.setTestCollection(_mkTestCollection([test]));

                repeater.repeat(1);

                assert.notCalled(repeatCounter.addTest);
                assert.notCalled(hermione.addTestToRun);
            });
        });

        it('should register each test in repeat counter', () => {
            const repeatCounter = _mkRepeatCounter();
            const repeater = Repeater.create(hermione, repeatCounter);
            const tests = [_mkTest(), _mkTest()];
            repeater.setTestCollection(_mkTestCollection(tests));

            repeater.repeat(1);

            assert.calledTwice(repeatCounter.addTest);
            assert.calledWith(repeatCounter.addTest.firstCall, tests[0]);
            assert.calledWith(repeatCounter.addTest.secondCall, tests[1]);
        });

        it('should repeat test the specified number of repeats', () => {
            const repeater = Repeater.create(hermione, _mkRepeatCounter());
            const test = _mkTest({browserId: 'yabro-1'});
            repeater.setTestCollection(_mkTestCollection([test]));

            repeater.repeat(2);

            assert.calledTwice(hermione.addTestToRun);
            assert.calledWith(hermione.addTestToRun.firstCall, test, test.browserId);
            assert.calledWith(hermione.addTestToRun.secondCall, test, test.browserId);
        });
    });
});
