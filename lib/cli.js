'use-strict';

var program = require('commander');

var parser = require('./parser');
var updater = require('./updater');
var reporter = require('./reporter');
var prompter = require('./prompter');

var cli = {

	start: function() {
		cli.parseCommandLine();
	},

	prompt: function(options) {
		prompter.start(options);
	},

	execute: function(options, reportOptions, processingOptions) {
		parser.getAll(options)
			.then(function(fileData) {
				var referenceReport = reporter.getReport(fileData, reportOptions);
				if (referenceReport) {
					console.log(referenceReport);
				}
				if (processingOptions.fixBrokenReferences && processingOptions.promptToFix) {
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
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
			});
	},

	parseCommandLine: function() {

		var command = 'prompt';

		program
			.version('0.1')
			.description('Finds and repairs broken references in files.')

			// Configuration options
			.option('-d, --dir <directory>', 'The working directory in which to fix broken references recursively')
			.option('-f, --filter-directories <directory_globs>', 'Comma-separated list of globs to filter directories parsed')
			.option('-F, --filter-files <filename_globs>', 'Comma-separated list of globs to filter files parsed')

			// Report options
			.option('-s, --sources', 'List the files (sources of references) that contain references to other files')
			.option('-e, --errors', 'List the files that contain broken references to other files')

			// Processing options
			.option('-u, --unprompted', 'Don\'t prompt to fix broken references, just fix them (unless -r)')
			.option('-r, --read-only', 'Don\'t fix broken references');

		program
			.command('references')
			.description('List all references in the current working directory')
			.action(function(arg) {
				command = arg._name;
			});

		program.parse(process.argv);

		var options = {};
		if (program.dir) {
			options.workingDir = program.dir;
		}
		if (program.filterDirectories) {
			options.directoryFilter = program.filterDirectories.split(',');
		}
		if (program.filterFiles) {
			var fileGlobs = program.filterFiles.split(',');
			options.referencingFileFilter = fileGlobs;
			options.referencedFileFilter = fileGlobs;
		}

		var reportOptions = {
			referencingFiles: program.sources,
			brokenReferences: program.errors
		};
		if (process.argv.length === 2) {
			reportOptions.brokenReferences = true;
		}

		var processingOptions = {
			fixBrokenReferences: !program.readOnly,
			promptToFix: !program.unprompted
		};

		cli.execute(options, reportOptions, processingOptions);

	}

};

module.exports = {
	start: cli.start
};