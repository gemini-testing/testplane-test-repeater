# hermione-test-repeater

## Overview

Use the [hermione-test-repeater][hermione-test-repeater] plugin to run the same test (or group of tests) the required number of times.

This plugin can be useful in cases when you need to make sure that the written tests are stable. The plugin guarantees that the tests will be run as many times as you set, regardless of the results of their run in each attempt. In addition, the plugin allows you to run tests every time in a new browser session. This eliminates the impact of browser degradation or any other side effects that could occur during repeated runs in the same browser session.

## Install

```bash
npm install -D hermione-test-repeater
```

## Setup

Add the plugin to the `plugins` section of the `hermione` config:

```javascript
module.exports = {
    plugins: {
        'hermione-test-repeater': {
            enabled: true,
            repeat: 50,
            minRepeat: 10,
            maxRepeat: 100,
            uniqSession: true
        },

        // other hermione plugins...
    },

    // other hermione settings...
}
```

### Description of configuration parameters

| **Parameter** | **Type** | **Default&nbsp;value** | **Description** |
| :--- | :---: | :---: | :--- |
| enabled | Boolean | true | Enable / disable the plugin. |
| repeat | Number | 0 | How many times you need to run the test, regardless of the result of its run. |
| minRepeat | Number | 0 | The minimum number of times the test can be run. |
| maxRepeat | Number | Infinity | The maximum number of times the test can be run. |
| uniqSession | Boolean | true | Run each test in a unique browser session. |

### Passing parameters via the CLI

All plugin parameters that can be defined in the config can also be passed as command line options or through environment variables during Hermione startup. Use the prefix `--test-repeater-` for command line options and `hermione_test_repeater_` for environment variables. For example:

```bash
npx hermione --test-repeater-repeat 5
```

```bash
hermione_test_repeater_repeat=5 npx hermione
```

## Usage

### Option --repeat

The plugin also adds a special `--repeat` option to Hermione's [CLI][cli], with which you can run the test the right number of times in a more convenient way. For example:

```bash
npx hermione --repeat 5
```

## Useful links

* [hermione-test-repeater plugin sources][hermione-test-repeater]

[hermione-test-repeater]: https://github.com/gemini-testing/hermione-test-repeater
[cli]: https://en.wikipedia.org/wiki/Command-line_interface
