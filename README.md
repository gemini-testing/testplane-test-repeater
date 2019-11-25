# hermione-test-repeater

[![NPM version](https://img.shields.io/npm/v/hermione-test-repeater.svg?style=flat)](https://www.npmjs.org/package/hermione-test-repeater)
[![Build Status](https://travis-ci.org/gemini-testing/hermione-test-repeater.svg?branch=master)](https://travis-ci.org/gemini-testing/hermione-test-repeater)

Plugin for [hermione](https://github.com/gemini-testing/hermione) to repeat tests the specified number of times.

You can read more about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install hermione-test-repeater
```

## Usage

Plugin has following configuration:

- **enabled** (optional) `Boolean` – enable/disable the plugin. `true` by default;
- **repeat** (optional) `Number` – how many times tests should be repeated regardless of the result. `0` by default;
- **minRepeat** (optional) `Number` - minimum limit of repeat count. `0` by default;
- **maxRepeat** (optional) `Number` - maximum limit of repeat count. `Infinity` by default.

Also there is ability to override plugin parameters by CLI options or environment variables
(see [configparser](https://github.com/gemini-testing/configparser)).
Use `hermione_test_repeater` prefix for the environment variables and `--test-repeater-` for the cli options.

For example you can override `repeat` option like so:

```bash
$ hermione_test_repeater_repeat=5 npx hermione
$ npx hermione --test-repeater-repeat 5
```

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...
    plugins: {
        'hermione-test-repeater': {
            enabled: true,
            repeat: 50,
            minRepeat: 10,
            maxRepeat: 100
        },
    },
    // ...
};
```

## Additional options

Additional options that are added to the hermione.

### repeat

Option that adds ability to set repeat count in more convenient way.

Example of usage:
```
npx hermione --repeat 5
```
