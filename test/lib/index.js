'use strict';

const {AsyncEmitter} = require('gemini-core').events;
const plugin = require('lib');
const RepeatCounter = require('lib/repeat-counter');
const Repeater = require('lib/repeater');
const {logger} = require('lib/utils');

describe('plugin', () => {
    let hermione;

    const _mkHermione = (opts = {}) => {
        opts = {proc: 'master', browsers: {}, ...opts};

        const hermione = new AsyncEmitter();
        hermione.isWorker = sinon.stub().returns(opts.proc === 'worker');
        hermione.intercept = sinon.stub();
        hermione.config = {
            getBrowserIds: () => Object.keys(opts.browsers),
            forBrowser: (id) => opts.browsers[id]
        };
        hermione.events = {
            CLI: 'cli',
            INIT: 'init',
            AFTER_TESTS_READ: 'afterTestsRead',
            RUNNER_START: 'runnerStart',
            TEST_PASS: 'testPass',
            TEST_FAIL: 'testFail',
            RETRY: 'retry'
        };

        return hermione;
    };

    const _initPlugin = async ({cliOpts = {}, hermioneInst = hermione} = {}) => {
        cliOpts = {option: sinon.stub(), ...cliOpts};

        hermioneInst.emit(hermioneInst.events.CLI, cliOpts);
        await hermioneInst.emitAndWait(hermioneInst.events.INIT);
    };

    beforeEach(() => {
        sinon.stub(RepeatCounter, 'create').returns(Object.create(RepeatCounter.prototype));
        sinon.stub(RepeatCounter.prototype, 'testExecuted');
        sinon.stub(RepeatCounter.prototype, 'getRepeatsLeft');

        sinon.stub(Repeater, 'create').returns(Object.create(Repeater.prototype));
        sinon.stub(Repeater.prototype, 'setTestCollection');
        sinon.stub(Repeater.prototype, 'repeat');

        sinon.stub(logger, 'info');

        hermione = _mkHermione();
    });

    afterEach(() => sinon.restore());

    it('should do nothing if plugin is disabled', () => {
        sinon.spy(hermione, 'on');

        plugin(hermione, {enabled: false});

        assert.notCalled(hermione.on);
        assert.notCalled(Repeater.create);
    });

    it('should do nothing in worker process', () => {
        const hermione = _mkHermione({proc: 'worker'});
        sinon.spy(hermione, 'on');

        plugin(hermione);

        assert.notCalled(hermione.on);
        assert.notCalled(Repeater.create);
    });

    it('should extend cli by "repeat" option on "CLI" event', () => {
        const cliTool = {option: sinon.stub()};
        plugin(hermione);

        hermione.emit(hermione.events.CLI, cliTool);

        assert.calledOnceWith(cliTool.option, '--repeat <number>', sinon.match.string, sinon.match.func);
    });

    it('should not crash if plugin is using through hermione api', async () => {
        plugin(hermione, {repeat: 100500});

        await assert.isFulfilled(hermione.emitAndWait(hermione.events.INIT));
    });

    describe('"INIT" event', () => {
        describe('if "repeat" option is not specified', () => {
            it('should not reset retries', async () => {
                const browsers = {yabro: {retry: 100500}};
                const hermione = _mkHermione({browsers});
                plugin(hermione);

                await _initPlugin({hermioneInst: hermione});

                assert.equal(browsers.yabro.retry, 100500);
            });

            it('should not create instance of repeater', async () => {
                plugin(hermione);

                await _initPlugin();

                assert.notCalled(Repeater.create);
            });
        });

        describe('if "repeat" option is specified', () => {
            it('should reset retries for each browser', async () => {
                const browsers = {yabro1: {retry: 100500}, yabro2: {retry: 500100}};
                const hermione = _mkHermione({browsers});
                plugin(hermione);

                await _initPlugin({cliOpts: {repeat: 100500}, hermioneInst: hermione});

                assert.equal(browsers.yabro1.retry, 0);
                assert.equal(browsers.yabro2.retry, 0);
            });

            it('should use option from plugin config if it does not specified through cli', async () => {
                plugin(hermione, {repeat: 100500});

                await _initPlugin();
                await hermione.emitAndWait(hermione.events.RUNNER_START);

                assert.calledOnceWith(Repeater.prototype.repeat, 100500);
            });

            it('should use option from cli even if it specified in plugin config', async () => {
                plugin(hermione, {repeat: 100500});

                await _initPlugin({cliOpts: {repeat: 500100}});
                await hermione.emitAndWait(hermione.events.RUNNER_START);

                assert.calledOnceWith(Repeater.prototype.repeat, 500100);
            });

            [
                {name: 'min', option: 'minRepeat', repeat: 5},
                {name: 'max', option: 'maxRepeat', repeat: 100500}
            ].forEach(({name, option, repeat}) => {
                it(`should limit option by ${name} value from plugin config`, async () => {
                    plugin(hermione, {[option]: 10});

                    await _initPlugin({cliOpts: {repeat}});
                    await hermione.emitAndWait(hermione.events.RUNNER_START);

                    assert.calledOnceWith(Repeater.prototype.repeat, 10);
                });
            });

            it('should inform that repeat count was changed if it outside of limits', async () => {
                plugin(hermione, {minRepeat: 10, maxRepeat: 50});

                await _initPlugin({cliOpts: {repeat: 5}});

                assert.calledOnceWith(
                    logger.info,
                    'repeat count was changed from 5 to 10 because it should be in range of 10 - 50'
                );
            });

            it('should not inform if repeat count is within limits', async () => {
                plugin(hermione, {minRepeat: 10, maxRepeat: 20});

                await _initPlugin({cliOpts: {repeat: 15}});

                assert.notCalled(logger.info);
            });

            it('should init repeat counter instance', async () => {
                plugin(hermione);

                await _initPlugin({cliOpts: {repeat: 1}});

                assert.calledOnceWithExactly(RepeatCounter.create);
            });

            it('should init repeater with hermione and repeat counter instances', async () => {
                plugin(hermione);

                await _initPlugin({cliOpts: {repeat: 1}});

                assert.calledOnceWith(Repeater.create, hermione, RepeatCounter.prototype);
            });

            it('should set test collection in repeater on "AFTER_TESTS_READ" event', async () => {
                plugin(hermione);
                const testCollection = {};

                await _initPlugin({cliOpts: {repeat: 1}});
                hermione.emit(hermione.events.AFTER_TESTS_READ, testCollection);

                assert.calledOnceWith(Repeater.prototype.setTestCollection, testCollection);
            });

            describe('"TEST_FAIL" interceptor', () => {
                const callInterceptorCb = (arg) => {
                    const cb = hermione.intercept.lastCall.args[1];

                    return cb(arg);
                };

                it('should intercept event', async () => {
                    plugin(hermione);

                    await _initPlugin({cliOpts: {repeat: 100500}});

                    assert.calledWith(hermione.intercept, hermione.events.TEST_FAIL);
                });

                describe('if repeat count of test is positive', () => {
                    beforeEach(() => {
                        RepeatCounter.prototype.getRepeatsLeft.returns(100500);
                    });

                    it('should translate event to "RETRY"', async () => {
                        plugin(hermione);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        const translated = callInterceptorCb({data: {}});

                        assert.equal(translated.event, hermione.events.RETRY);
                    });

                    it('should add "retriesLeft" field to translated test data', async () => {
                        plugin(hermione);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        const translated = callInterceptorCb({data: {foo: 'bar'}});

                        assert.deepEqual(translated.data, {foo: 'bar', retriesLeft: 100500});
                    });
                });

                it('should not change intercepted event if repeat count of test is not positive', async () => {
                    RepeatCounter.prototype.getRepeatsLeft.returns(0);
                    plugin(hermione);

                    await _initPlugin({cliOpts: {repeat: 100500}});
                    const translated = callInterceptorCb({event: 'TEST_FAIL', data: {foo: 'bar'}});

                    assert.deepEqual(translated, {event: 'TEST_FAIL', data: {foo: 'bar'}});
                });
            });

            ['TEST_PASS', 'RETRY'].forEach((event) => {
                describe(`${event} handler`, () => {
                    it('should count test as executed', async () => {
                        const test = {};
                        plugin(hermione);

                        await _initPlugin({cliOpts: {repeat: 100500}});
                        hermione.emit(hermione.events[event], test);

                        assert.calledOnceWith(RepeatCounter.prototype.testExecuted, test);
                    });
                });
            });
        });
    });
});
