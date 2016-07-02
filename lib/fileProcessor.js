'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var confirm = require('confirm-simple');
var inquirer = require('inquirer');
var clc = require('cli-color');

var parser = require('./parser');
var utils = require('./utils');
var config = require('./config');

var updater = {

	existingFiles: {},
	referencedFiles: {},
	brokenReferences: [],

	update: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		// Command line argument
		//var filePath = process.argv[2].replace(config.workingDir, '');
		var self = this;
		console.log('\n' + clc.blue.bold('Looking for broken module references in ') + clc.blue(config.workingDir));
		parser.getAll(config)
			.then(function(references) {
				updater.existingFiles = references.existingFiles;
				updater.referencedFiles = references.referencedFiles;
				updater.brokenReferences = references.brokenReferences;
				console.log(clc.blue.bold('Searching ' + Object.keys(updater.existingFiles).length + ' files\n'));
				updater.printReport();
				updater.promptToCorrect();
			}).catch(function(err) {
				console.error(err);
			});
	},

	printReport: function() {
		var messages = [];
		if (updater.brokenReferences.length) {
			updater.brokenReferences.forEach(function(brokenReference) {
				if (!brokenReference.isWithinScope) {
					messages.push(clc.red.bold('Unchecked Reference: ') + clc.red(brokenReference.referencedFile));
					messages.push(clc.red('File lies outside specified scope'));
				} else {
					messages.push(clc.red.bold('Broken Reference:    ') + clc.red(brokenReference.referencedFile));
					if (brokenReference.correctPath) {
						messages.push(clc.green.bold('Corrected Reference: ') + clc.green(brokenReference.correctPath));
					} else if (brokenReference.possibleCorrectPaths.length > 1) {
						messages.push(clc.red.bold('Couldn\'t determine correct reference from among these possibilities:'));
						messages.push(clc.red(brokenReference.possibleCorrectPaths.join('\n')));
					} else {
						messages.push(clc.green.bold('Corrected Reference: ') + clc.red('Couldn\'t determine correct reference'));
					}
				}
				messages.push(clc.bold('Files Containing Broken Reference:'));
				brokenReference.referencingFiles.forEach(function(referencingFilePath) {
					messages.push('   ' + referencingFilePath);
				});
				messages.push('');
			});
		} else {
			messages.push(clc.green.bold('No broken references found\n'));
		}
		console.log(messages.join('\n'));
	},

	promptToCorrect: function() {
		var self = this;
		var filesToFix = updater.getFilesToFix(updater.brokenReferences);
		var referencesWithMultiplePossibleCorrections = updater.brokenReferences.filter(function(brokenReference) {
			return !brokenReference.correctPath && brokenReference.possibleCorrectPaths.length > 1;
		});
		if (Object.keys(filesToFix).length || Object.keys(referencesWithMultiplePossibleCorrections).length) {
			inquirer.prompt({
				type: 'confirm',
				name: 'correct',
				message: 'Update files to correct references?'
			}).then(function(confirmed) {
				if (confirmed.correct) {
					return updater.correctReferences(filesToFix).then(function() {
						updater.promptToSelectCorrectPath(referencesWithMultiplePossibleCorrections);
					});
				} else {
					return true;
				}
			}).catch(function(err) {
				console.error(err);
			});
		}

	},

	promptToSelectCorrectPath: function(referencesWithMultiplePossibleCorrections) {
		var self = this;
		var questions = [];
		referencesWithMultiplePossibleCorrections.forEach(function(referenceWithMultipleOptions) {
			var newQuestions = updater.setPromptQuestionForEachFile(referenceWithMultipleOptions);
			questions = questions.concat(newQuestions);
		});
		console.log('\n');
		inquirer.prompt(questions).then(function(answers) {
			var fixedReferences = [];
			for (var referenceToCorrect in answers) {
				var brokenReference = updater.brokenReferences.find(function(reference) {
					return reference.referencedFile === referenceToCorrect;
				});
				brokenReference.correctPath = answers[referenceToCorrect];
				fixedReferences.push(brokenReference);
			}
			var filesToFix = updater.getFilesToFix(fixedReferences);
			updater.correctReferences(filesToFix);
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
	},

	getFilesToFix: function(brokenReferences) {
		var self = this;
		var filesToFix = {};
		brokenReferences.forEach(function(brokenReference) {
			if (!brokenReference.correctPath || !brokenReference.isWithinScope) {
				return;
			}
			brokenReference.referencingFiles.forEach(function(pathOfReferencingFile) {
				var relativePathImported = utils.getRelativePathOfReference(pathOfReferencingFile, brokenReference.referencedFile, updater.existingFiles);
				var correctedRelativePath = utils.getRelativePathFromAbsolutePath(pathOfReferencingFile, brokenReference.correctPath);
				if (!filesToFix[pathOfReferencingFile]) {
					filesToFix[pathOfReferencingFile] = {referencesToFix: []};
				}
				filesToFix[pathOfReferencingFile].referencesToFix.push({
					relativePathImported: relativePathImported,
					correctedRelativePath: correctedRelativePath
				});
			});
		});
		return filesToFix;
	},

	correctReferences: function(filesToFix) {
		console.log(clc.green.bold('\nFiles updated to correct references:'));
		var promises = [];
		var self = this;
		Object.keys(filesToFix).forEach(function(pathOfFileToFix) {
			var deferred = Q.defer();
			promises.push(deferred.promise);
			fs.readFile(pathOfFileToFix, 'utf8', function(err, fileContent) {
				if (!err) {
					var referencesToFix = filesToFix[pathOfFileToFix].referencesToFix;
					var correctedFileContent = fileContent;
					referencesToFix.forEach(function(referenceToFix) {
						correctedFileContent = updater.replaceImportStringInFile(correctedFileContent, referenceToFix.relativePathImported, referenceToFix.correctedRelativePath);
					});
					fs.writeFile(pathOfFileToFix, correctedFileContent, 'utf8', function(err) {
						if (!err) {
							console.log(pathOfFileToFix);
							deferred.resolve();
						} else {
							console.error('Error writing updated file', err);
						}
					});
				} else {
					console.error("Couldn't read file", err);
				}
			});
		});
		return Q.allSettled(promises);
	},

	replaceImportStringInFile: function(fileContent, searchString, replacementString) {
		var searchPattern = utils.getSearchPattern(searchString, config);
		var correctedFileContent = fileContent.replace(searchPattern, function(match) {
			return match.replace(searchString, replacementString);
		});
		return correctedFileContent;
	}

};

module.exports = {
	update: updater.update,
	getReferences: updater.getReferences,
	getBrokenReferences: updater.getBrokenReferences
};