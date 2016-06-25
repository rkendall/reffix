'use strict';

var fs = require('fs');
var path = require('path');
var file = require('file');
var fse = require('fs-extra');
var Q = require('q');
var confirm = require('confirm-simple');
var inquirer = require('inquirer');
var clc = require('cli-color');
var prettyjson = require('prettyjson');

var updater = {

	workingDir: '/Users/robertkendall/code/react/react-bootstrap',
	//workingDir: '/Users/robertkendall/code/react/test',
	//workingDir: '/Users/robertkendall/code/react/test2/perseus/src',
	//workingDir: process.cwd(),
	existingFiles: {},
	referencedFiles: {},
	brokenReferences: [],
	promises: [],
	excludedDirs: ['node_modules', 'build', 'qa', '.idea'],
	supportedExtensions: ['js', 'jsx', 'json'],
	searchPatterns: [
		'(^|\\s)import \\S+ from $1',
		'(^|\\s)(var|let|const) \\S+ = require\\($1\\)'
	],
	replacementPattern: '("\\.+\\/[^"\\s]+"|\'\\.+\\/[^\'\\s]+\')',

	update: function() {
		// Command line argument
		//var filePath = process.argv[2].replace(this.workingDir, '');
		console.log('Looking for broken module references in ' + this.workingDir);
		this.processFiles();
	},

	processFiles: function() {
		var self = this;
		fse.walk(this.workingDir)
			.on('data', function(item) {
				var path = item.path;
				var excludedDirPattern = new RegExp('\\/' + self.excludedDirs.join('|') + '\\/');
				if (/\.(js|jsx|json)$/.test(path) && !excludedDirPattern.test(path)) {
					var promise = Q.nfcall(fs.readFile, path, 'utf8')
						.then(function(fileContent) {
							self.getAndSavePathData(path, fileContent)
						})
						.fail(function(err) {
							console.error('Error reading file: ', err);
						});
					self.promises.push(promise);
				}
			})
			.on('end', function() {
				Q.allSettled(self.promises)
					.then(function() {
						console.log('Searching ' + Object.keys(self.existingFiles).length + ' files\n');
						self.getBrokenReferences();
						self.getCorrectedPathsForMovedFiles();
						self.printReport();
						self.promptToCorrect();
					});
			});
	},

	getAndSavePathData: function(filePath, fileContent) {
		this.existingFiles[filePath] = {referencedFiles: []};
		this.getAndSaveReferencesWithinFile(fileContent, filePath);
	},

	getAndSaveReferencesWithinFile: function(fileContent, pathOfFileContainingReference) {
		var matches;
		var pattern = this.getSearchPattern();
		while ((matches = pattern.exec(fileContent)) !== null) {
			var statement = matches[0];
			var pathPattern = /['"]([^'"]+)['"]/;
			var relativePathOfReference = statement.match(pathPattern)[1];
			if (!relativePathOfReference) {
				console.error('Couldn\'t get path of reference from file');
				return;
			}
			var absolutePathOfReference = this.getAbsolutePathFromRelativePath(pathOfFileContainingReference, relativePathOfReference);
			this.existingFiles[pathOfFileContainingReference].referencedFiles.push({
				relativeReference: relativePathOfReference,
				absoluteReference: absolutePathOfReference
			});
			if (!this.referencedFiles[absolutePathOfReference]) {
				this.referencedFiles[absolutePathOfReference] = {referencingFiles: []};
			}
			this.referencedFiles[absolutePathOfReference].referencingFiles.push(pathOfFileContainingReference);
		}
	},


	getBrokenReferences: function() {
		for (var pathOfReferencedFile in this.referencedFiles) {
			if (!this.doesFileExist(pathOfReferencedFile)) {
				var referencingFiles = this.referencedFiles[pathOfReferencedFile].referencingFiles;
				var brokenReference = {
					referencedFile: pathOfReferencedFile,
					referencingFiles: referencingFiles,
					possibleCorrectPaths: []
			};
				this.brokenReferences.push(brokenReference);
			}
		}
	},

	getCorrectedPathsForMovedFiles: function() {
		var self = this;
		this.brokenReferences.forEach(function(brokenReference) {
			brokenReference = self.determineCorrectPathForReference(brokenReference);
		});
	},

	determineCorrectPathForReference: function(brokenReference) {
		var filePathOfBrokenReference = brokenReference.referencedFile;
		var filenameOfBrokenReference = path.basename(filePathOfBrokenReference);
		brokenReference.isWithinScope = this.isFileInsideDirsToFix(filePathOfBrokenReference);
		for (var pathOfExistingFile in this.existingFiles) {
			var nameOfExistingFile = path.basename(pathOfExistingFile);
			// If the filename of the broken reference matches the filename of an existing file
			// the path of the existing file must be the new location of the file in the broken reference
			if (filenameOfBrokenReference === nameOfExistingFile) {
				brokenReference.possibleCorrectPaths.push(pathOfExistingFile);
			}
		}
		// Don't overwrite paths that are corrected within moved files
		if (brokenReference.possibleCorrectPaths.length === 1 && !brokenReference.correctPath) {
			brokenReference.correctPath = brokenReference.possibleCorrectPaths[0];
			brokenReference.isWithinScope = true;
			//var brokenReferencesWithinMovedFile = this.existingFiles[pathOfExistingFile].referencedFiles;
			//this.determineCorrectPathsForReferencesWithinMovedFiles(filePathOfBrokenReference, brokenReferencesWithinMovedFile);

		}
		return brokenReference;
	},

	// // This will allow dealing even with files that have duplicate names
	// determineCorrectPathsForReferencesWithinMovedFiles: function(pathOfFileContainingBrokenReferences, brokenReferencesWithinFile) {
	// 	var self = this;
	// 	brokenReferencesWithinFile.forEach(function(brokenReferenceWithinFile) {
	// 		// Add the corrected path to the main list of broken references
	// 		self.brokenReferences.some(function(brokenReferenceInMainList) {
	// 			if (brokenReferenceInMainList.referencedFile === brokenReferenceWithinFile.absoluteReference) {
	// 				var correctDir = path.resolve(path.dirname(pathOfFileContainingBrokenReferences), path.dirname(brokenReferenceWithinFile.relativeReference));
	// 				var correctPath = correctDir + '/' + path.basename(brokenReferenceWithinFile.relativeReference);
	// 				var correctPathWithExtension = self.restoreFileExtension(correctPath);
	// 				brokenReferenceInMainList.isWithinScope = self.isFileInsideDirsToFix(correctPathWithExtension);
	// 				if (self.doesFileExist(correctPathWithExtension)) {
	// 					brokenReferenceInMainList.correctPath = correctPathWithExtension;
	// 				} else {
	// 					console.error('Mistakenly created this corrected path: ', correctPathWithExtension);
	// 				}
	// 				return true;
	// 			}
	// 		});
	// 	});
	// },

	printReport: function() {
		var messages = [];
		if (this.brokenReferences.length) {
			this.brokenReferences.forEach(function(brokenReference) {
				if (!brokenReference.isWithinScope) {
					messages.push(clc.red('Unchecked Reference: ' + brokenReference.referencedFile));
					messages.push(clc.red('File lies outside specified scope'));
				} else {
					messages.push(clc.red('Broken Reference:    ' + brokenReference.referencedFile));
					if (brokenReference.correctPath) {
						messages.push(clc.green('Corrected Reference: ' + brokenReference.correctPath));
					} else if (brokenReference.possibleCorrectPaths.length > 1) {
						messages.push(clc.red('Couldn\'t determine correct reference from among these possibilities:'));
						messages.push(clc.red(brokenReference.possibleCorrectPaths.join('\n')));
					} else {
						messages.push(clc.green('Corrected Reference: '), clc.red('Couldn\'t determine correct reference'));
					}
				}
				messages.push('Files Containing Broken Reference:');
				brokenReference.referencingFiles.forEach(function(referencingFilePath) {
					messages.push('   ' + referencingFilePath);
				});
				messages.push('');
			});
		} else {
			messages.push('No broken references found');
		}
		console.log(messages.join('\n'));
	},

	promptToCorrect: function() {
		var self = this;
		var filesToFix = this.getFilesToFix(this.brokenReferences);
		var referencesWithMultiplePossibleCorrections = this.brokenReferences.filter(function(brokenReference) {
			return brokenReference.possibleCorrectPaths.length > 1;
		});
		var promise;
		if (Object.keys(filesToFix).length || Object.keys(referencesWithMultiplePossibleCorrections).length) {
			inquirer.prompt({
				type: 'confirm',
				name: 'correct',
				message: 'Update files to correct references?'
			}).then(function(confirmed) {
				console.log(confirmed.correct);
				if (confirmed.correct) {
					return self.correctReferences(filesToFix).then(function() {
						self.promptToSelectCorrectPath(referencesWithMultiplePossibleCorrections);
					});
				} else {
					return true;
				}
			}).catch(function(err) {
				console.error(err);
			});
		} else {
			promise = new Q.defer();
			promise.resolve();
		}

		// promise.then(function() {
		// 	// TODO Workaround to prevent results from being written after prompt
		// 	setTimeout(function() {
		// 		self.promptToSelectCorrectPath();
		// 	}, 500);
		// });

	},
	
	promptToSelectCorrectPath: function(referencesWithMultiplePossibleCorrections) {
		var self = this;
		// var referencesWithMultiplePossibleCorrections = this.brokenReferences.filter(function(brokenReference) {
		// 	return brokenReference.possibleCorrectPaths.length > 1;
		// });
		var questions = [];
		referencesWithMultiplePossibleCorrections.forEach(function(referenceWithMultipleOptions) {
			questions.push({
				type: 'list',
				name: referenceWithMultipleOptions.referencedFile,
				message: 'Choose the correct path for this reference:\n' + referenceWithMultipleOptions.referencedFile,
				choices: referenceWithMultipleOptions.possibleCorrectPaths
			})
		});
		inquirer.prompt(questions).then(function(answers) {
			var fixedReferences = [];
			for (var referenceToCorrect in answers) {
				var brokenReference = self.brokenReferences.find(function(reference) {
					return reference.referencedFile === referenceToCorrect;
				});
				brokenReference.correctPath = answers[referenceToCorrect];
				fixedReferences.push(brokenReference);
			}
			var filesToFix = self.getFilesToFix(fixedReferences);
			self.correctReferences(filesToFix);
		});

	},

	getFilesToFix: function (brokenReferences) {
		var self = this;
		var filesToFix = {};
		brokenReferences.forEach(function(brokenReference) {
			if (!brokenReference.correctPath || !brokenReference.isWithinScope) {
				return;
			}
			brokenReference.referencingFiles.forEach(function(pathOfReferencingFile) {
				var relativePathImported = self.getRelativePathOfReference(pathOfReferencingFile, brokenReference.referencedFile);
				var correctedRelativePath = self.getRelativePathFromAbsolutePath(pathOfReferencingFile, brokenReference.correctPath);
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
		console.log('\nFiles updated to correct references:');
		var promises = [];
		var self = this;
		Object.keys(filesToFix).forEach(function(pathOfFileToFix) {
			fs.readFile(pathOfFileToFix, 'utf8', function(err, data) {
				if (err) {
					console.error("Couldn't read file", err);
				} else {
					var referencesToFix = filesToFix[pathOfFileToFix].referencesToFix;
					referencesToFix.forEach(function(referenceToFix) {
						// TODO Use the original search pattern for this
						data = self.replaceImportStringInFile(data, referenceToFix.relativePathImported, referenceToFix.correctedRelativePath);
					});
					var promise = Q.nfcall(fs.writeFile, pathOfFileToFix, data, 'utf8')
						.then(function() {
							console.log(pathOfFileToFix);
						})
						.fail(function(err) {
							console.error('Error writing updated file', err);
						});
					promises.push(promise);
				}
			});
		});
		return Q.allSettled(promises);
	},

	replaceImportStringInFile: function(fileContent, searchString, replacement) {
		return fileContent.replace(searchString, replacement);
	},

	// UTILITY FUNCTIONS

	getSearchPattern: function() {
		var patternString = ('(' + this.searchPatterns.join('|') + ')').replace('$1', this.replacementPattern);
		return new RegExp(patternString, 'g');
	},

	getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
		var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
		var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
		var absolutePathOfReferenceWithFileExtension = this.restoreFileExtension(absolutePathOfReference);
		return absolutePathOfReferenceWithFileExtension;
	},

	getRelativePathFromAbsolutePath: function (pathOfReferencingFile, absolutePathOfReference) {
		var relativeDir = path.relative(path.dirname(pathOfReferencingFile), path.dirname(absolutePathOfReference));
		var relativePath = relativeDir + '/' + path.basename(absolutePathOfReference);
		if (relativePath.substring(0,1) !== '.') {
			relativePath = './' + relativePath;
		}
		return relativePath;
	},


	getRelativePathOfReference: function (pathOfReferencingFile, pathReferenced) {
		var referencedFile = this.existingFiles[pathOfReferencingFile].referencedFiles.find(function(referencedFile) {
			return referencedFile.absoluteReference === pathReferenced;
		});
		return referencedFile.relativeReference;
	},

	isFileInsideDirsToFix: function(pathOfReferencedFile) {
		return pathOfReferencedFile.substr(0, this.workingDir.length) === this.workingDir;
	},

	doesFileExist: function(filePath) {
		return this.existingFiles.hasOwnProperty(filePath);
	},

	// isFileReferenced: function(filePath) {
	// 	return this.referencedFiles.hasOwnProperty(filePath);
	// },

	doesFileHaveSupportedExtension: function(filePath) {
		var pattern = new RegExp('\\.(' + this.supportedExtensions.join('|') + ')$');
		return pattern.test(filePath);
	},

	restoreFileExtension: function(filePath) {
		if (!this.doesFileHaveSupportedExtension(filePath)) {
			filePath += '.js';
		}
		return filePath;
	}

};

exports.updater = updater;

