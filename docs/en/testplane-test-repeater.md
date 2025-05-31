# @testplane/test-repeater

## Overview

Use the [@testplane/test-repeater][@testplane/test-repeater] plugin to run the same test (or group of tests) the required number of times.

This plugin can be useful in cases when you need to make sure that the written tests are stable. The plugin guarantees that the tests will be run as many times as you set, regardless of the results of their run in each attempt. In addition, the plugin allows you to run tests every time in a new browser session. This eliminates the impact of browser degradation or any other side effects that could occur during repeated runs in the same browser session.

## Install

```bash
npm install -D @testplane/test-repeater
```

## Setup

Add the plugin to the `plugins` section of the `testplane` config:

```javascript
module.exports = {
    plugins: {
        '@testplane/test-repeater': {
            enabled: true,
            repeat: 50,
            minRepeat: 10,
            maxRepeat: 100,
            uniqSession: true,
            parallelRepeats: true
        },

        // other testplane plugins...
    },

    // other testplane settings...
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
| parallelRepeats | Boolean | true | Determines the test repeat execution mode: immediately (parallel execution) or after the previous one completes (sequential execution). |

### Passing parameters via the CLI

All plugin parameters that can be defined in the config can also be passed as command line options or through environment variables during Testplane startup. Use the prefix `--test-repeater-` for command line options and `testplane_test_repeater_` for environment variables. For example:

```bash
npx testplane --test-repeater-repeat 5
```

```bash
testplane_test_repeater_repeat=5 npx testplane
```

## Usage

### Option --repeat

The plugin also adds a special `--repeat` option to Testplane's [CLI][cli], with which you can run the test the right number of times in a more convenient way. For example:

```bash
npx testplane --repeat 5
```

## Useful links

* [@testplane/test-repeater plugin sources][@testplane/test-repeater]

[@testplane/test-repeater]: https://github.com/gemini-testing/testplane-test-repeater
[cli]: https://en.wikipedia.org/wiki/Command-line_interface
