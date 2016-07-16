'use-strict';

var program = require('commander');

var config = require('./config');
var parser = require('./parser');
var updater = require('./updater');
var reporter = require('./reporter');
var prompter = require('./prompter');

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

		var command = 'prompt';

		program
			.version('0.1')
			.description('Finds and repairs broken references recursively in files in the working directory.')
			.usage('[options] [working_directory]')

			// Configuration options
			.option('-c, --config [filepath]', 'Path of custom configuration file')
			.option('-m, --mode <default|html>', 'Type of references to look for, module import/require references (default) or HTML links (html)')
			.option('-d, --dir <directories>', 'Comma-separated list of directories to exclude from parsing. Quotes required. (e.g., \'test,bin\')')
			.option('-f, --files <source_globs> [target_globs]', 'Filter the source (referencing) and target (referenced) files that are analyzed and repaired. (e.g., \'*1.js,*2.js\' \'file.js\'')

			// Report options
			.option('-e, --errors', 'List the files that contain broken references to other files and prompt you to fix them')
			.option('-s, --sources', 'List the files (sources of references) that contain references to other files')
			.option('-t, --targets', 'List the files (targets of references) that are referenced by other files')

			// Processing options
			.option('-u, --unprompted', 'Don\'t prompt to fix broken references, just fix them (unless -r)')
			.option('-r, --read-only', 'Don\'t fix broken references')
			.parse(process.argv);

		if (program.mode) {
			config.setMode(program.mode);
		}

		var options = {};
		var cliResults = this.getMultipleArgsForOptions();
		options.workingDir = cliResults._trailingArg;
		if (cliResults.dir) {
			options.directoryFilter = cliResults.dir[0]
				? cliResults.dir[0].replace(/['"]/g, '').split(/, *| +/)
				: null;
		}
		if (cliResults.files) {
			options.referencingFileFilter = cliResults.files[0]
				? cliResults.files[0].replace(/['"]/g, '').split(/, *| +/)
				: null;
			options.referencedFileFilter = cliResults.files[1]
				? cliResults.files[1].replace(/['"]/g, '').split(/, *| +/)
				: null;
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
			fixBrokenReferences: !program.readOnly && reportOptions.brokenReferences,
			promptToFix: !program.unprompted
		};

		cli.execute(reportOptions, processingOptions);

	},

	// Commander doesn't suppport multiple arguments for an options,
	// that support is added here
	getMultipleArgsForOptions: function() {
		var argsToParse = program.rawArgs.slice(2);
		var optionValues = {};
		var optionName = '';
		var numOfArgsRemaining = 0;
		argsToParse.forEach(function(arg, ind) {
			var matchingOption = program.options.find(function(option) {
				return arg === option.short || arg === option.long;
			});
			if (matchingOption) {
				optionName = matchingOption.long.substr(2);
				var matchArgs = matchingOption.flags.match(/\[.+?\]|<.+?>/g);
				numOfArgsRemaining = matchArgs ? matchArgs.length : 0;
				if (numOfArgsRemaining) {
					optionValues[optionName] = [];
				} else {
					optionValues[optionName] = true;
				}
			} else if (numOfArgsRemaining) {
				optionValues[optionName].push(arg);
				numOfArgsRemaining --;
			// Get optional trailing arg
			} else if (ind === argsToParse.length - 1) {
				optionValues._trailingArg = arg;
			}
		});
		return optionValues;
	},

};

module.exports = {
	start: cli.start
};