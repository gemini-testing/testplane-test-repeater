'use strict';

const _ = require('lodash');

const assertType = (name, validationFn, type) => {
    return (value) => {
        if (!validationFn(value)) {
            throw new TypeError(`"${name}" option must be ${type}, but got ${typeof value}`);
        }
    };
};

const assertInteger = (name) => assertType(name, Number.isInteger, 'integer');

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

exports.assertBoolean = (name) => assertType(name, _.isBoolean, 'boolean');

exports.assertNonNegativeInteger = (value, name) => {
    assertInteger(name)(value);

    if (value < 0) {
        throw new TypeError(`"${name}" option must be non-negative integer`);
    }
};

exports.assertPositiveIntegerOrInfinity = (value, name) => {
    if (!isPositiveInteger(value) && value !== Infinity) {
        throw new TypeError(`"${name}" option must be a positive integer or Infinity`);
    }
};
