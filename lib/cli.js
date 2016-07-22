'use-strict';

var program = require('commander');

var config = require('./config');
var parser = require('./parser');
var updater = require('./updater');
var reporter = require('./reporter');
var prompter = require('./prompter');
var utils = require('./utils');

var cli = {

	start: function() {
		cli.parseCommandLine();
	},

	// PRIVATE METHODS

	execute: function(reportOptions, processingOptions) {
		parser.getAll()
			.then(function(fileData) {
				console.log('');
				reporter.showReport(reporter.reportFilesChecked(fileData));
				reporter.showReport(reporter.getReport(fileData, reportOptions));
				if (processingOptions.fixBrokenReferences) {
					if (processingOptions.promptToFix) {
						prompter.promptToCorrect(fileData.brokenReferences, fileData.existingFiles);
					} else {
						updater.update(fileData.brokenReferences, fileData.existingFiles)
							.then(function(namesArrayOfFilesFixed) {
								var message = reporter.reportFilesUpdated(namesArrayOfFilesFixed);
								if (message) {
									console.log(message);
								}
							});
					}
				}
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
			});
	},

	parseCommandLine: function() {

		program
			.version('0.1')
			.description('Finds and repairs broken references in the working directory. Enclose all option values in quotes.')
			.usage('[options] [--] [working_directory]')

			// Configuration options
			.option('-c, --config [filepath]', 'path of custom configuration file')
			.option('-m, --mode <default|html>', 'type of references to look for, JS import/require (default) or HTML href/src (html)')
			.option('-f, --files <source_globs> [target_globs]', 'filter the source (referencing) and target (referenced) files parsed (e.g., \'*1.js,*2.js\' \'file.js\'')
			.option('-d, --dirs <directory_globs>', 'exclude from sources the specified directories (e.g., \'test,bin\')')

			// Report options
			.option('-e, --errors', 'list broken references and prompt to fix them')
			.option('-s, --sources', 'list files (sources of references) containing references to other files')
			.option('-t, --targets', 'list files (targets of references) referenced by other files')

			// Processing options
			.option('-n, --no-prompts', 'fix broken references without prompting (unless -r)')
			.option('-r, --report-only', 'don\'t fix broken references, just display reports')
			.parse(process.argv);


		var options = {};
		var cliResults = this.getMultipleArgsForOptions();
		if (cliResults.mode) {
			options.mode = cliResults.mode[0];
		}
		options.workingDirectory = cliResults._trailingArg;
		if (cliResults.dirs) {
			options.directoriesToExclude = cliResults.dirs[0]
				? cliResults.dirs[0].split(/, *| +/)
				: null;
		}
		if (cliResults.files) {
			if (cliResults.files[0]) {
				var referencingFileGlobs = cliResults.files[0];
				if (referencingFileGlobs !== '') {
					options.referencingFileFilter = referencingFileGlobs.split(/, *| +/);
				}
			}
			if (cliResults.files[1]) {
				var referencedFileGlobs = cliResults.files[1];
				if (referencedFileGlobs !== '') {
					options.referencedFileFilter = referencedFileGlobs.split(/, *| +/);
				}
			}
		}

		var pathOfCustomConfigFile = program.config || null;
		config.set(options, pathOfCustomConfigFile);

		var reportOptions = {
			brokenReferences: Boolean(program.errors),
			referencingFiles: Boolean(program.sources),
			referencedFiles: Boolean(program.targets)
		};
		if (!reportOptions.brokenReferences && !reportOptions.referencingFiles && !reportOptions.referencedFiles) {
			reportOptions.brokenReferences = true;
		}

		var processingOptions = {
			fixBrokenReferences: !cliResults.reportOnly && reportOptions.brokenReferences,
			promptToFix: !cliResults.noPrompts
		};

		cli.execute(reportOptions, processingOptions);

	},

	// Commander doesn't suppport multiple arguments for an options,
	// that support is added here
	getMultipleArgsForOptions: function() {
		var argsToParse = [];
		var appArgs = program.rawArgs.slice(2);
		appArgs.forEach(function(arg) {
			// Expand grouped short options (-abc)
			var argLength = arg.length;
			if (arg.indexOf('-') === 0 && argLength > 2) {
				for (var i = 1; i < argLength; i ++) {
					argsToParse.push('-' + arg[i]);
				}
			} else {
				argsToParse.push(arg);
			}
		});
		var optionValues = {};
		var optionName = '';
		var numOfArgsRemaining = 0;
		argsToParse.some(function(arg, ind) {
			var matchingOption = program.options.find(function(option) {
				return arg === option.short || arg === option.long;
			});
			if (matchingOption) {
				var hyphenatedOptionName = matchingOption.long.substr(2);
				optionName = utils.camelCase(hyphenatedOptionName);
				var matchArgs = matchingOption.flags.match(/\[.+?\]|<.+?>/g);
				numOfArgsRemaining = matchArgs ? matchArgs.length : 0;
				if (numOfArgsRemaining) {
					optionValues[optionName] = [];
				} else {
					optionValues[optionName] = true;
				}
			} else if (arg === '--') {
				trailingArg = argsToParse[ind + 1];
				if (trailingArg) {
					optionValues._trailingArg = trailingArg;
				}
				return true;
			} else if (numOfArgsRemaining) {
				// Some terminals retain the quotes around the args
				var argWithQuotesRemoved = arg.replace(/['"]/g, '');
				optionValues[optionName].push(argWithQuotesRemoved);
				numOfArgsRemaining --;
			// Get optional trailing arg
			} else if (ind === argsToParse.length - 1) {
				optionValues._trailingArg = arg;
			}
			return false;
		});
		return optionValues;
	}

};

module.exports = {
	start: cli.start
};