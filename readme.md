
# dep-doc

The **Dependency Doctor** for analyzing and fixing broken links, references, and dependencies in any type of files.

## Features

- Fixes broken `require` and `import` statements in JavaScript files
- Fixes broken `src` and `href` attributes in HTML files
- Fully cusomizable to support references in any other types of files
- Run it from the command line or use it in JavaScript projects
- Generates comprehensive reports about all the dependencies in a project
- Comprehensive filtering options

## Install

```
// Install to run from the command line
npm install --global dep-doc

// Install as a module
npm install --save dep-doc
```

## Command Line Usage

By default, dep-doc will generate a report of broken module references by recursing through the directory in which it is launched. It will then list the broken and corrected paths and prompt you to fix them. All reports list absolute paths, but relative paths will be used to update the files.

![Command line output](file:///Users/robertkendall/code/dependency-doctor/img/example1.png)

The program can repair only references broken as a result of files being moved. It cannot yet handle references broken as a result of files being renamed. If a broken reference refers to a filename that is shared by mutliple files in different locations, dep-doc will prompt you to select the correct filepath to use for the corrected reference.

 \<screenshot here>

```js
const chalk = require('chalk');

console.log(chalk.blue('Hello world!'));
```

Chalk comes with an easy to use composable API where you just chain and nest the styles you want.

Here without `console.log` for purity.

```js
const chalk = require('chalk');

// combine styled and normal strings
chalk.blue('Hello') + 'World' + chalk.red('!');

// compose multiple styles using the chainable API
chalk.blue.bgRed.bold('Hello world!');

// pass in multiple arguments
chalk.blue('Hello', 'World!', 'Foo', 'bar', 'biz', 'baz');

// nest styles
chalk.red('Hello', chalk.underline.bgBlue('world') + '!');

// nest styles of the same type even (color, underline, background)
chalk.green(
	'I am a green line ' +
	chalk.blue.underline.bold('with a blue substring') +
	' that becomes green again!'
);

// ES2015 template literal
const systemStats = `
CPU: ${chalk.red('90%')}
RAM: ${chalk.green('40%')}
DISK: ${chalk.yellow('70%')}
`;
```

Easily define your own themes.

```js
const chalk = require('chalk');
const error = chalk.bold.red;
console.log(error('Error!'));
```

Take advantage of console.log [string substitution](http://nodejs.org/docs/latest/api/console.html#console_console_log_data).

```js
const name = 'Sindre';
console.log(chalk.green('Hello %s'), name);
//=> 'Hello Sindre'
```


## API

### chalk.`<style>[.<style>...](string, [string...])`

Example: `chalk.red.bold.underline('Hello', 'world');`

Chain [styles](#styles) and call the last one as a method with a string argument. Order doesn't matter, and later styles take precedent in case of a conflict. This simply means that `Chalk.red.yellow.green` is equivalent to `Chalk.green`.

Multiple arguments will be separated by space.

### chalk.enabled

Color support is automatically detected, but you can override it by setting the `enabled` property. You should however only do this in your own code as it applies globally to all chalk consumers.

If you need to change this in a reusable module create a new instance:

```js
const ctx = new chalk.constructor({enabled: false});
```

### chalk.supportsColor

Detect whether the terminal [supports color](https://github.com/chalk/supports-color). Used internally and handled for you, but exposed for convenience.

Can be overridden by the user with the flags `--color` and `--no-color`. For situations where using `--color` is not possible, add an environment variable `FORCE_COLOR` with any value to force color. Trumps `--no-color`.

### chalk.styles

Exposes the styles as [ANSI escape codes](https://github.com/chalk/ansi-styles).

Generally not useful, but you might need just the `.open` or `.close` escape code if you're mixing externally styled strings with your own.

```js
const chalk = require('chalk');

console.log(chalk.styles.red);
//=> {open: '\u001b[31m', close: '\u001b[39m'}

console.log(chalk.styles.red.open + 'Hello' + chalk.styles.red.close);
```


## Styles

### Modifiers

- `reset`
- `bold`
- `dim`
- `italic` *(not widely supported)*
- `underline`
- `inverse`
- `hidden`
- `strikethrough` *(not widely supported)*

### Colors

- `black`
- `red`
- `green`
- `yellow`
- `blue` *(on Windows the bright version is used as normal blue is illegible)*
- `magenta`
- `cyan`
- `white`
- `gray`

### Background colors

- `bgBlack`
- `bgRed`
- `bgGreen`
- `bgYellow`
- `bgBlue`
- `bgMagenta`
- `bgCyan`
- `bgWhite`


## 256-colors

Chalk does not support anything other than the base eight colors, which guarantees it will work on all terminals and systems. Some terminals, specifically `xterm` compliant ones, will support the full range of 8-bit colors. For this the lower level [ansi-256-colors](https://github.com/jbnicolai/ansi-256-colors) package can be used.


## Windows

If you're on Windows, do yourself a favor and use [`cmder`](http://cmder.net/) instead of `cmd.exe`.


## Related

- [chalk-cli](https://github.com/chalk/chalk-cli) - CLI for this module
- [ansi-styles](https://github.com/chalk/ansi-styles) - ANSI escape codes for styling strings in the terminal
- [supports-color](https://github.com/chalk/supports-color) - Detect whether a terminal supports color
- [strip-ansi](https://github.com/chalk/strip-ansi) - Strip ANSI escape codes
- [has-ansi](https://github.com/chalk/has-ansi) - Check if a string has ANSI escape codes
- [ansi-regex](https://github.com/chalk/ansi-regex) - Regular expression for matching ANSI escape codes
- [wrap-ansi](https://github.com/chalk/wrap-ansi) - Wordwrap a string with ANSI escape codes
- [slice-ansi](https://github.com/chalk/slice-ansi) - Slice a string with ANSI escape codes


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)