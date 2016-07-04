'use strict';

var inquirer = require('inquirer');
var clc = require('cli-color');

var config = require('./config').default;
var parser = require('./parser');
var updater = require('./updater');

var prompter = {

	start: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		// Command line argument
		//var filePath = process.argv[2].replace(config.workingDir, '');
		console.log('\n' + clc.blue.bold('Looking for broken references in ') + clc.blue(config.workingDir));
		parser.getAll(config)
			.then(function(references) {
				console.log(clc.blue.bold('Searching ' + Object.keys(references.existingFiles).length + ' files\n'));
				console.log(parser.getReport(references.brokenReferences));
				prompter.promptToCorrect(references.brokenReferences);
			}).catch(function(err) {
				console.error(err.message, err.stack);
			});
	},

	// PRIVATE FUNCTIONS

	promptToCorrect: function(brokenReferences) {
		var numberOfFilesToFix = parser.getNumberOfFilesToFix(brokenReferences);
		var referencesWithMultiplePossibleCorrections = parser.getReferencesWithMultiplePossibleCorrections(brokenReferences);
		if (numberOfFilesToFix || Object.keys(referencesWithMultiplePossibleCorrections).length) {
			inquirer.prompt({
				type: 'confirm',
				name: 'correct',
				message: 'Update files to correct references?'
			}).then(function(confirmed) {
				if (confirmed.correct) {
					prompter.correctAndReport(brokenReferences);
				} else {
					return true;
				}
			}).catch(function(err) {
				console.error(err.message, err.stack);
			});
		}

	},

	correctAndReport: function(brokenReferences) {
		updater.update(brokenReferences)
			.then(function(message) {
				console.log(clc.green.bold('\nFiles updated to correct references:'));
				console.log(message);
			});
	},

	promptToSelectCorrectPath: function(brokenReferences) {
		var referencesWithMultiplePossibleCorrections = parser.getReferencesWithMultiplePossibleCorrections(brokenReferences);
		var questions = [];
		referencesWithMultiplePossibleCorrections.forEach(function(referenceWithMultipleOptions) {
			var newQuestions = prompter.setPromptQuestionForEachFile(referenceWithMultipleOptions);
			questions = questions.concat(newQuestions);
		});
		console.log('\n');
		inquirer.prompt(questions).then(function(answers) {
			var fixedReferences = [];
			for (var referenceToCorrect in answers) {
				var brokenReference = brokenReferences.find(function(reference) {
					return reference.referencedFile === referenceToCorrect;
				});
				brokenReference.correctPath = answers[referenceToCorrect];
				fixedReferences.push(brokenReference);
			}
			prompter.correctAndReport(fixedReferences);
		}).catch(function(err) {
			console.error(err);
		});
	},

	setPromptQuestionForEachFile: function(referenceWithMultipleOptions) {
		var questions = [];
		referenceWithMultipleOptions.referencingFiles.forEach(function(referencingFile) {
			questions.push({
				type: 'list',
				name: referenceWithMultipleOptions.referencedFile,
				message: clc.blue('\nChoose the correct path for this broken reference: ') + referenceWithMultipleOptions.referencedFile + clc.blue('\nwhich is contained in this file: ') + referencingFile + clc.blue('\nSelect one of the following paths:\n'),
				choices: referenceWithMultipleOptions.possibleCorrectPaths
			});
		});
		return questions;
	}

};

module.exports = {
	start: prompter.start
};