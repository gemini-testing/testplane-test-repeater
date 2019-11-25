'use strict';

const parseConfig = require('lib/config');

describe('config', () => {
    describe('"enabled" option', () => {
        it('should throw error if option is not a boolean', () => {
            assert.throws(
                () => parseConfig({enabled: 'true'}),
                Error,
                '"enabled" option must be boolean, but got string'
            );
        });

        it('should be enabled by default', () => {
            assert.isTrue(parseConfig({}).enabled);
        });

        it('should set provided value', () => {
            const config = parseConfig({enabled: false});

            assert.isFalse(config.enabled);
        });
    });

    ['repeat', 'minRepeat'].forEach((optionName) => {
        describe(`"${optionName}" option`, () => {
            it('should throw error if option is not an integer', () => {
                assert.throws(
                    () => parseConfig({[optionName]: 'true'}),
                    Error,
                    `"${optionName}" option must be integer, but got string`
                );
            });

            it('should throw error if option is negative', () => {
                assert.throws(
                    () => parseConfig({[optionName]: -100500}),
                    Error,
                    `"${optionName}" option must be non-negative integer`
                );
            });

            it('should set 0 by default', () => {
                assert.equal(parseConfig({})[optionName], 0);
            });

            it('should set provided value', () => {
                const config = parseConfig({[optionName]: 100500});

                assert.equal(config[optionName], 100500);
            });
        });
    });

    describe('"maxRepeat" option', () => {
        it('should throw error if option is not an integer', () => {
            assert.throws(
                () => parseConfig({maxRepeat: 'true'}),
                Error,
                '"maxRepeat" option must be a positive integer or Infinity'
            );
        });

        it('should throw error if option is negative', () => {
            assert.throws(
                () => parseConfig({maxRepeat: -100500}),
                Error,
                '"maxRepeat" option must be a positive integer or Infinity'
            );
        });

        it('should set Infinity by default', () => {
            assert.equal(parseConfig({}).maxRepeat, Infinity);
        });

        it('should set provided value', () => {
            const config = parseConfig({maxRepeat: 100500});

            assert.equal(config.maxRepeat, 100500);
        });
    });
});
