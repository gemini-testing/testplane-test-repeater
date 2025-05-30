'use strict';

const plugin = require('lib');
const RepeatCounter = require('lib/repeat-counter');
const Repeater = require('lib/repeater');
const {logger} = require('lib/utils');
const EventEmitter2 = require('eventemitter2');

describe('plugin', () => {
    let testplane;

    const _mkTestplane = (opts = {}) => {
        opts = {proc: 'master', browsers: {}, ...opts};

        const testplane = new EventEmitter2();
        testplane.isWorker = sinon.stub().returns(opts.proc === 'worker');
        testplane.intercept = sinon.stub();
        testplane.config = {
            getBrowserIds: () => Object.keys(opts.browsers),
            forBrowser: (id) => opts.browsers[id]
        };
        testplane.events = {
            CLI: 'cli',
            INIT: 'init',
            AFTER_TESTS_READ: 'afterTestsRead',
            BEGIN: 'begin',
            TEST_PASS: 'testPass',
            TEST_FAIL: 'testFail',
            RETRY: 'retry'
        };

        return testplane;
    };

    const _initPlugin = async ({cliOpts = {}, testplaneInst = testplane} = {}) => {
        cliOpts = {option: sinon.stub(), ...cliOpts};

        testplaneInst.emit(testplaneInst.events.CLI, cliOpts);
        await testplaneInst.emitAsync(testplaneInst.events.INIT);
    };

    beforeEach(() => {
        sinon.stub(RepeatCounter, 'create').returns(Object.create(RepeatCounter.prototype));
        sinon.stub(RepeatCounter.prototype, 'testExecuted');
        sinon.stub(RepeatCounter.prototype, 'getRepeatsLeft');

        sinon.stub(Repeater, 'create').returns(Object.create(Repeater.prototype));
        sinon.stub(Repeater.prototype, 'setTestCollection');
        sinon.stub(Repeater.prototype, 'repeat');
        sinon.stub(Repeater.prototype, 'handleTestEnd');

        sinon.stub(logger, 'info');

        testplane = _mkTestplane();
    });

    afterEach(() => sinon.restore());

    it('should do nothing if plugin is disabled', () => {
        sinon.spy(testplane, 'on');

        plugin(testplane, {enabled: false});

        assert.notCalled(testplane.on);
        assert.notCalled(Repeater.create);
    });

    it('should do nothing in worker process', () => {
        const testplane = _mkTestplane({proc: 'worker'});
        sinon.spy(testplane, 'on');

        plugin(testplane);

        assert.notCalled(testplane.on);
        assert.notCalled(Repeater.create);
    });

    it('should extend cli by "repeat" option on "CLI" event', () => {
        const cliTool = {option: sinon.stub()};
        plugin(testplane);

        testplane.emit(testplane.events.CLI, cliTool);

        assert.calledOnceWith(cliTool.option, '--repeat <number>', sinon.match.string, sinon.match.func);
    });

    it('should not crash if plugin is using through testplane api', async () => {
        plugin(testplane, {repeat: 100500});

        await assert.isFulfilled(testplane.emitAsync(testplane.events.INIT));
    });

    describe('"INIT" event', () => {
        describe('if "repeat" option is not specified', () => {
            it('should not reset retries', async () => {
                const browsers = {yabro: {retry: 100500}};
                const testplane = _mkTestplane({browsers});
                plugin(testplane);

                await _initPlugin({testplaneInst: testplane});

                assert.equal(browsers.yabro.retry, 100500);
            });

            it('should not reset testsPerSession option', async () => {
                const browsers = {yabro: {testsPerSession: 100500}};
                const testplane = _mkTestplane({browsers});
                plugin(testplane);

                await _initPlugin({testplaneInst: testplane});

                assert.equal(browsers.yabro.testsPerSession, 100500);
            });

            it('should not create instance of repeater', async () => {
                plugin(testplane);

                await _initPlugin();

                assert.notCalled(Repeater.create);
            });
        });

        describe('if "repeat" option is specified', () => {
            it('should reset retries for each browser', async () => {
                const browsers = {yabro1: {retry: 100500}, yabro2: {retry: 500100}};
                const testplane = _mkTestplane({browsers});
                plugin(testplane);

                await _initPlugin({cliOpts: {repeat: 100500}, testplaneInst: testplane});

                assert.equal(browsers.yabro1.retry, 0);
                assert.equal(browsers.yabro2.retry, 0);
            });

            it('should reset testsPerSession option for each browser by default', async () => {
                const browsers = {yabro1: {testsPerSession: 100}, yabro2: {testsPerSession: 500}};
                const testplane = _mkTestplane({browsers});
                plugin(testplane);

                await _initPlugin({cliOpts: {repeat: 100}, testplaneInst: testplane});

                assert.equal(browsers.yabro1.testsPerSession, 1);
                assert.equal(browsers.yabro2.testsPerSession, 1);
            });

            it('should not reset testsPerSession option if it disabled from config', async () => {
                const browsers = {yabro1: {testsPerSession: 100}};
                const testplane = _mkTestplane({browsers});
                plugin(testplane, {uniqSession: false});

                await _initPlugin({cliOpts: {repeat: 100}, testplaneInst: testplane});

                assert.equal(browsers.yabro1.testsPerSession, 100);
            });

            it('should use option from plugin config if it does not specified through cli', async () => {
                plugin(testplane, {repeat: 100500});

                await _initPlugin();
                testplane.emit(testplane.events.BEGIN);

                assert.calledOnceWith(Repeater.prototype.repeat, 100500);
            });

            it('should use option from cli even if it specified in plugin config', async () => {
                plugin(testplane, {repeat: 100500});

                await _initPlugin({cliOpts: {repeat: 500100}});
                testplane.emit(testplane.events.BEGIN);

                assert.calledOnceWith(Repeater.prototype.repeat, 500100);
            });

            [
                {name: 'min', option: 'minRepeat', repeat: 5},
                {name: 'max', option: 'maxRepeat', repeat: 100500}
            ].forEach(({name, option, repeat}) => {
                it(`should limit option by ${name} value from plugin config`, async () => {
                    plugin(testplane, {[option]: 10});

                    await _initPlugin({cliOpts: {repeat}});
                    testplane.emit(testplane.events.BEGIN);

                    assert.calledOnceWith(Repeater.prototype.repeat, 10);
                });
            });

            it('should inform that repeat count was changed if it outside of limits', async () => {
                plugin(testplane, {minRepeat: 10, maxRepeat: 50});

                await _initPlugin({cliOpts: {repeat: 5}});

                assert.calledOnceWith(
                    logger.info,
                    'repeat count was changed from 5 to 10 because it should be in range of 10 - 50'
                );
            });

            it('should not inform if repeat count is within limits', async () => {
                plugin(testplane, {minRepeat: 10, maxRepeat: 20});

                await _initPlugin({cliOpts: {repeat: 15}});

                assert.notCalled(logger.info);
            });

            it('should init repeat counter instance', async () => {
                plugin(testplane);

                await _initPlugin({cliOpts: {repeat: 1}});

                assert.calledOnceWith(RepeatCounter.create);
            });

            it('should init repeater with testplane and repeat counter instances', async () => {
                plugin(testplane);

                await _initPlugin({cliOpts: {repeat: 1}});

                assert.calledOnceWith(Repeater.create, testplane, RepeatCounter.prototype);
            });

            it('should set test collection in repeater on "AFTER_TESTS_READ" event', async () => {
                plugin(testplane);
                const testCollection = {};

                await _initPlugin({cliOpts: {repeat: 1}});
                testplane.emit(testplane.events.AFTER_TESTS_READ, testCollection);

                assert.calledOnceWith(Repeater.prototype.setTestCollection, testCollection);
            });

            describe('"TEST_FAIL" interceptor', () => {
                const callInterceptorCb = (arg) => {
                    const cb = testplane.intercept.lastCall.args[1];

                    return cb(arg);
                };

                it('should intercept event', async () => {
                    plugin(testplane);

                    await _initPlugin({cliOpts: {repeat: 100500}});

                    assert.calledWith(testplane.intercept, testplane.events.TEST_FAIL);
                });

                describe('if repeat count of test is positive', () => {
                    beforeEach(() => {
                        RepeatCounter.prototype.getRepeatsLeft.returns(100500);
                    });

                    it('should translate event to "RETRY"', async () => {
                        plugin(testplane);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        const translated = callInterceptorCb({data: {}});

                        assert.equal(translated.event, testplane.events.RETRY);
                    });

                    it('should add "retriesLeft" field to translated test data', async () => {
                        plugin(testplane);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        const translated = callInterceptorCb({data: {foo: 'bar'}});

                        assert.deepEqual(translated.data, {foo: 'bar', retriesLeft: 100500});
                    });
                });

                it('should not change intercepted event if repeat count of test is not positive', async () => {
                    RepeatCounter.prototype.getRepeatsLeft.returns(0);
                    plugin(testplane);

                    await _initPlugin({cliOpts: {repeat: 100500}});
                    const translated = callInterceptorCb({event: 'TEST_FAIL', data: {foo: 'bar'}});

                    assert.deepEqual(translated, {event: 'TEST_FAIL', data: {foo: 'bar'}});
                });
            });

            ['TEST_PASS', 'RETRY'].forEach((event) => {
                describe(`${event} handler`, () => {
                    it('should handle test end', async () => {
                        const test = {};
                        plugin(testplane);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        testplane.emit(testplane.events[event], test);

                        assert.calledOnceWith(Repeater.prototype.handleTestEnd, test);
                    });
                });
            });
        });
    });
});
