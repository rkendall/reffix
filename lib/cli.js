'use-strict';

var program = require('commander');

var parser = require('./parser');
var prompter = require('./prompter');

var cli = {

	start: function() {
		cli.parseCommandLine();
	},

	prompt: function(options) {
		prompter.start(options);
	},

	references: function(options) {
		parser.getReferences(options)
			.then(function(result) {
				console.log(result);
			});
	},

	parseCommandLine: function() {

		var command = 'prompt';

		program
			.version('0.1')
			.description('Finds and repairs broken references in files.')
			.option('-c, --cwd <currentWorkingDir>', 'The directory in which to fix broken references')
			.option('-d, --dirs <directories>', 'List of globs to filter directories included')
			.option('-s, --sources <files>', 'List of globs (separated by commas) to filter referencing files')
			.option('-t, --targets <files>', 'List of globs (separated by commas) to filter referenced files');

		program
			.command('references')
			.description('List all references in the current working directory')
			.action(function(arg) {
				command = arg._name;
			});

		program.parse(process.argv);

		var options = {};

		if (program.cwd) {
			options.workingDir = program.cwd;
		}
		if (program.dirs) {
			options.directoryFilter = program.dirs.split(',');
		}
		if (program.sources) {
			options.referencingFileFilter = program.sources.split(',');
		}
		if (program.targets) {
			options.referencedFileFilter = program.targets.split(',');
		}

		cli[command](options);

	}

};

module.exports = {
	start: cli.start
};