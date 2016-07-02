'use strict';

(function() {

	var fs = require('fs');
	var path = require('path');
	var readdirp = require('readdirp');
	var Q = require('q');
	var confirm = require('confirm-simple');
	var inquirer = require('inquirer');
	var clc = require('cli-color');

	// var config = {
	// 	workingDir: process.cwd(),
	// 	directoryFilter: [
	// 		'!.git',
	// 		'!node_modules',
	// 		'!.idea'
	// 	],
	// 	supportedExtensions: ['js', 'jsx', 'json'],
	// 	searchPatterns: [
	// 		'(^|\\s)import (\\S+|\{[^}]+\}) from %%',
	// 		'(^|\\s)(var|let|const) \\S+ = require\\(%%\\)'
	// 	]
	// };

	var updater = {

		config: {
			workingDir: process.cwd(),
			directoryFilter: [
				'!.git',
				'!node_modules',
				'!.idea'
			],
			supportedExtensions: ['js', 'jsx', 'json'],
			searchPatterns: [
				'(^|\\s)import (\\S+|\{[^}]+\}) from %%',
				'(^|\\s)(var|let|const) \\S+ = require\\(%%\\)'
			]
		},

		existingFiles: {},
		referencedFiles: {},
		brokenReferences: [],

		update: function(options) {
			if (options) {
				Object.assign(updater.config, options);
			}
			// Command line argument
			//var filePath = process.argv[2].replace(updater.config.workingDir, '');
			var self = this;
			console.log('\n' + clc.blue.bold('Looking for broken module references in ') + clc.blue(updater.config.workingDir));
			updater.getReferences()
				.then(function(references) {
					console.log(clc.blue.bold('Searching ' + Object.keys(references.existingFiles).length + ' files\n'));
					updater.existingFiles = references.existingFiles;
					updater.referencedFiles = references.referencedFiles;
					updater.getAllBrokenReferences();
					updater.getCorrectedPathsForMovedFiles();
					updater.printReport();
					updater.promptToCorrect();
				}).catch(function(err) {
					console.error(err);
				});
		},

		getReferences: function(options) {
			if (options) {
				Object.assign(updater.config, options);
			}
			var self = this;
			var promises = [];
			var existingFiles = {};
			var referencedFiles = {};
			var deferredResult = Q.defer();
			var options = {
				root: updater.config.workingDir,
				fileFilter: updater.config.supportedExtensions.map(function(extension) {
					return '*.' + extension;
				}),
				directoryFilter: updater.config.directoryFilter,
				entryType: 'files'
			};
			readdirp(options)
				.on('data', function(item) {
					var path = item.fullPath;
					var deferred = Q.defer();
					fs.readFile(path, 'utf8', function(err, fileContent) {
						if (!err) {
							var result = updater.getReferencesWithinFile(path, fileContent, referencedFiles);
							Object.assign(existingFiles, result.existingFiles);
							referencedFiles = result.referencedFiles;
							deferred.resolve();
						} else {
							console.error('Error reading file: ', err);
						}
					});
					promises.push(deferred.promise);
				})
				.on('warn', function(err) {
					console.error('Error getting file info: ', err);
				})
				.on('error', function(err) {
					console.error('Cannot process files: ', err);
				})
				.on('end', function() {
					Q.allSettled(promises)
						.then(function() {
							deferredResult.resolve({
								existingFiles: existingFiles,
								referencedFiles: referencedFiles
							});
						}).catch(function(err) {
							console.error(err);
							return err;
						});
				});
			return deferredResult.promise;
		},

		getBrokenReferences: function(options) {
			if (options) {
				Object.assign(updater.config, options);
			}
			return updater.getReferences(options)
				.then(function(references) {
					updater.existingFiles = references.existingFiles;
					updater.referencedFiles = references.referencedFiles;
					updater.getAllBrokenReferences();
					return updater.brokenReferences;
				})
				.catch(function(err) {
					console.error(err);
					return err;
				});
		},

		getReferencesWithinFile: function(pathOfFileContainingReference, fileContent, referencedFiles) {
			var existingFiles = {};
			var matches;
			var pattern = updater.getSearchPattern();
			existingFiles[pathOfFileContainingReference] = {referencedFiles: []};
			while ((matches = pattern.exec(fileContent)) !== null) {
				var statement = matches[0];
				// TODO This should be reused
				var pathPattern = /['"]([^'"]+)['"]/;
				var relativePathOfReference = statement.match(pathPattern)[1];
				if (!relativePathOfReference) {
					console.error('Couldn\'t get path of reference from file');
					return;
				}
				var absolutePathOfReference = updater.getAbsolutePathFromRelativePath(pathOfFileContainingReference, relativePathOfReference);
				existingFiles[pathOfFileContainingReference].referencedFiles.push({
					relativeReference: relativePathOfReference,
					absoluteReference: absolutePathOfReference
				});
				if (!referencedFiles[absolutePathOfReference]) {
					referencedFiles[absolutePathOfReference] = {referencingFiles: []};
				}
				referencedFiles[absolutePathOfReference].referencingFiles.push(pathOfFileContainingReference);
			}
			return {
				existingFiles: existingFiles,
				referencedFiles: referencedFiles
			};
		},


		getAllBrokenReferences: function() {
			for (var pathOfReferencedFile in updater.referencedFiles) {
				if (!updater.doesFileExist(pathOfReferencedFile)) {
					var referencingFiles = updater.referencedFiles[pathOfReferencedFile].referencingFiles;
					var brokenReference = {
						referencedFile: pathOfReferencedFile,
						referencingFiles: referencingFiles,
						possibleCorrectPaths: []
					};
					updater.brokenReferences.push(brokenReference);
				}
			}
		},

		getCorrectedPathsForMovedFiles: function() {
			var self = this;
			updater.brokenReferences.forEach(function(brokenReference) {
				brokenReference = updater.determineCorrectPathForReference(brokenReference);
			});
			updater.brokenReferences.forEach(function(brokenReference) {
				if (brokenReference.possibleCorrectPaths.length > 1) {
					brokenReference.correctPath = updater.getCorrectPathForDuplicateFilename(brokenReference);
				}
			});
		},

		determineCorrectPathForReference: function(brokenReference) {
			var filePathOfBrokenReference = brokenReference.referencedFile;
			var filenameOfBrokenReference = path.basename(filePathOfBrokenReference);
			brokenReference.isWithinScope = updater.isFileInsideDirsToFix(filePathOfBrokenReference);
			for (var pathOfExistingFile in updater.existingFiles) {
				var nameOfExistingFile = path.basename(pathOfExistingFile);
				// If the filename of the broken reference matches the filename of an existing file
				// the path of the existing file must be the new location of the file in the broken reference
				if (filenameOfBrokenReference === nameOfExistingFile) {
					brokenReference.possibleCorrectPaths.push(pathOfExistingFile);
				}
			}
			if (brokenReference.possibleCorrectPaths.length === 1 && !brokenReference.correctPath) {
				brokenReference.correctPath = brokenReference.possibleCorrectPaths[0];
				brokenReference.isWithinScope = true;
			}
			return brokenReference;
		},

		getCorrectPathForDuplicateFilename: function(brokenReference) {
			var self = this;
			var movedReferencingFile;
			var currentPathOfReferencingFile;
			// Get path of file that was moved and references the duplicate filename
			brokenReference.referencingFiles.some(function(pathOfReferencingFile) {
				updater.brokenReferences.some(function(brokenReferenceToCheck) {
					// If corrected path matches one of one of the referencing file paths
					// that referencing file has been moved
					if (brokenReferenceToCheck.correctPath === pathOfReferencingFile) {
						movedReferencingFile = brokenReferenceToCheck;
						currentPathOfReferencingFile = pathOfReferencingFile;
						return true;
					}
				});
				return true;
			});
			var correctedPath = null;
			// If file was moved, determine its directory-level relationship to other referenced files
			// and apply that relationship to the duplicated file to get the correct path
			if (movedReferencingFile) {
				var originalPathOfMovedReferencingFile = movedReferencingFile.referencedFile;
				var originalDirOfMovedReferencingFile = path.dirname(originalPathOfMovedReferencingFile);
				var relativePathOfBrokenReference = updater.getRelativePathOfReference(currentPathOfReferencingFile, brokenReference.referencedFile);
				correctedPath = path.resolve(originalDirOfMovedReferencingFile, relativePathOfBrokenReference);
			}
			return correctedPath;
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
					var relativePathImported = updater.getRelativePathOfReference(pathOfReferencingFile, brokenReference.referencedFile);
					var correctedRelativePath = updater.getRelativePathFromAbsolutePath(pathOfReferencingFile, brokenReference.correctPath);
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
			var searchPattern = updater.getSearchPattern((searchString));
			var correctedFileContent = fileContent.replace(searchPattern, function(match) {
				return match.replace(searchString, replacementString);
			});
			return correctedFileContent;
		},

		// UTILITY FUNCTIONS

		getSearchPattern: function(replacementString) {
			var generalReplacementPattern = '("%%"|\'%%\')';
			var specificReplacementPattern = replacementString ? replacementString.replace(/\./g, '\\.').replace(/\//g, '\\/') : '\\.+\\/[^"\'\\s]+';
			var replacementPattern = generalReplacementPattern.replace(/%%/g, specificReplacementPattern);
			var patternString = ('(' + updater.config.searchPatterns.join('|') + ')').replace(/%%/g, replacementPattern);
			return new RegExp(patternString, 'g');
		},

		getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
			var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
			var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
			var absolutePathOfReferenceWithFileExtension = updater.restoreFileExtension(absolutePathOfReference);
			return absolutePathOfReferenceWithFileExtension;
		},

		getRelativePathFromAbsolutePath: function(pathOfReferencingFile, absolutePathOfReference) {
			var relativeDir = path.relative(path.dirname(pathOfReferencingFile), path.dirname(absolutePathOfReference));
			var relativePath = relativeDir + '/' + path.basename(absolutePathOfReference);
			if (relativePath.substring(0, 1) !== '.') {
				relativePath = './' + relativePath;
			}
			return relativePath;
		},


		getRelativePathOfReference: function(pathOfReferencingFile, pathReferenced) {
			var referencedFile = updater.existingFiles[pathOfReferencingFile].referencedFiles.find(function(referencedFile) {
				return referencedFile.absoluteReference === pathReferenced;
			});
			return referencedFile.relativeReference;
		},

		isFileInsideDirsToFix: function(pathOfReferencedFile) {
			return pathOfReferencedFile.substr(0, updater.config.workingDir.length) === updater.config.workingDir;
		},

		doesFileExist: function(filePath) {
			return updater.existingFiles.hasOwnProperty(filePath);
		},

		// isFileReferenced: function(filePath) {
		// 	return updater.referencedFiles.hasOwnProperty(filePath);
		// },

		doesFileHaveSupportedExtension: function(filePath) {
			var pattern = new RegExp('\\.(' + updater.config.supportedExtensions.join('|') + ')$');
			return pattern.test(filePath);
		},

		restoreFileExtension: function(filePath) {
			if (!updater.doesFileHaveSupportedExtension(filePath)) {
				filePath += '.js';
			}
			return filePath;
		}

	};

	module.exports = {
		update: updater.update,
		getReferences: updater.getReferences,
		getBrokenReferences: updater.getBrokenReferences
	};

})();