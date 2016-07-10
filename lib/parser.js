'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var XRegExp = require('../vendor/xregexp-all');
var globToRegExp = require('glob-to-regexp');
var minimatch = require('minimatch');

var utils = require('./utils');
var config = require('./config');

var parser = {

	existingFiles: {},
	referencedFiles: {},
	brokenReferences: [],

	getReferences: function() {
		return parser.getDataFromFiles()
			.then(function(result) {
				var existingFiles = result.existingFiles;
				var referencingFiles = {};
				for (var filePath in existingFiles) {
					var existingFile = existingFiles[filePath];
					if (existingFile.referencedFiles.length) {
						referencingFiles[filePath] = existingFile.referencedFiles;
					}
				}
				parser.existingFiles = existingFiles;
				parser.referencingFiles = referencingFiles;
				parser.referencedFiles = result.referencedFiles;
				return {
					existingFiles: existingFiles,
					referencingFiles: referencingFiles,
					referencedFiles: result.referencedFiles
				}
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getBrokenReferences: function() {
		return parser.getReferences()
			.then(function() {
				parser.findAndSaveBrokenReferences();
				parser.getCorrectedPathsForMovedFiles();
				return {
					existingFiles: parser.existingFiles,
					brokenReferences: parser.brokenReferences
				}
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getAll: function() {
		return parser.getBrokenReferences()
			.then(function() {
				return {
					existingFiles: parser.existingFiles,
					referencingFiles: parser.referencingFiles,
					referencedFiles: parser.referencedFiles,
					brokenReferences: parser.brokenReferences
				};
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getReferencesWithMultiplePossibleCorrections: function(brokenReferences) {
		return brokenReferences.filter(function(brokenReference) {
			return !brokenReference.correctPath && brokenReference.possibleCorrectPaths.length > 1;
		});
	},
	
	getNumberOfFilesToFix: function(brokenReferences) {
		var numberOfFilesToFix = 0;
		brokenReferences.forEach(function(brokenReference) {
			if (brokenReference.correctPath && brokenReference.isWithinScope) {
				numberOfFilesToFix += brokenReference.referencingFiles.length;
			}
		});
		return numberOfFilesToFix;
	},

	// PRIVATE METHODS

	getDataFromFiles: function() {
		var promises = [];
		var existingFiles = {};
		var referencedFiles = {};
		var deferredResult = Q.defer();
		var settings = config.get();
		var readFileOptions = {
			root: settings.workingDir,
			fileFilter: utils.mergeArrays(settings.referencingFileFilter, settings.referencedFileFilter),
			directoryFilter: parser.isDirectoryIncluded,
			entryType: 'files'
		};
		console.log('\nParsing files in ' + readFileOptions.root);
		readdirp(readFileOptions)
			.on('data', function(item) {
				var path = item.fullPath;
				var deferred = Q.defer();
				fs.readFile(path, 'utf8', function(err, fileContent) {
					if (!err) {
						var result = parser.getReferencesWithinFile(path, fileContent, referencedFiles);
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
					})
					.catch(function(err) {
						console.error(err.message, err.stack);
						return err;
					});
			});
		return deferredResult.promise;
	},

	isDirectoryIncluded: function(item) {
		var dirName = item.name;
		var settings = config.get();
		// TODO use minimatch instead
		var isDirectoryExcluded = settings.directoryFilter.some(function(globPattern) {
			return minimatch(dirName, globPattern);
		});
		return !isDirectoryExcluded;
	},
	
	getReferencesWithinFile: function(pathOfFileContainingReference, fileContent, referencedFiles) {
		var settings = config.get();
		var existingFiles = {};
		existingFiles[pathOfFileContainingReference] = {referencedFiles: []};
		if (utils.isFileIncluded(pathOfFileContainingReference, settings.referencingFileFilter)) {
			var patterns = utils.getSearchPatterns(null, settings);
			patterns.forEach(function(pattern) {
				var match;
				var pos = 0;
				while (match = XRegExp.exec(fileContent, pattern, pos)) {
					pos = match.index + match[0].length;
					var relativePathOfReference = match.value;
					if (relativePathOfReference === null) {
						console.error('Couldn\'t get path of reference from file');
						return;
					}
					var absolutePathOfReference = utils.getAbsolutePathFromRelativePath(pathOfFileContainingReference, relativePathOfReference);
					if (utils.isFileIncluded(absolutePathOfReference, settings.referencedFileFilter)) {
						existingFiles[pathOfFileContainingReference].referencedFiles.push({
							relativeReference: relativePathOfReference,
							absoluteReference: absolutePathOfReference
						});
						if (!referencedFiles[absolutePathOfReference]) {
							referencedFiles[absolutePathOfReference] = {referencingFiles: []};
						}
						referencedFiles[absolutePathOfReference].referencingFiles.push(pathOfFileContainingReference);
					}
				}
			});
		}
		return {
			existingFiles: existingFiles,
			referencedFiles: referencedFiles
		};
	},

	findAndSaveBrokenReferences: function() {
		parser.brokenReferences = [];
		for (var pathOfReferencedFile in parser.referencedFiles) {
			if (!utils.doesFileExist(pathOfReferencedFile, parser.existingFiles)) {
				var referencingFiles = parser.referencedFiles[pathOfReferencedFile].referencingFiles;
				var brokenReference = {
					referencedFile: pathOfReferencedFile,
					referencingFiles: referencingFiles,
					possibleCorrectPaths: []
				};
				parser.brokenReferences.push(brokenReference);
			}
		}
	},

	getCorrectedPathsForMovedFiles: function() {
		var self = this;
		parser.brokenReferences.forEach(function(brokenReference) {
			brokenReference = parser.determineCorrectPathForReference(brokenReference);
		});
		parser.brokenReferences.forEach(function(brokenReference) {
			if (brokenReference.possibleCorrectPaths.length > 1) {
				brokenReference.correctPath = parser.getCorrectPathForDuplicateFilename(brokenReference);
			}
		});
	},

	determineCorrectPathForReference: function(brokenReference) {
		var filePathOfBrokenReference = brokenReference.referencedFile;
		var filenameOfBrokenReference = path.basename(filePathOfBrokenReference);
		brokenReference.isWithinScope = utils.isFileInsideDirsToFix(filePathOfBrokenReference, config.get());
		for (var pathOfExistingFile in parser.existingFiles) {
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
			parser.brokenReferences.some(function(brokenReferenceToCheck) {
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
			var relativePathOfBrokenReference = utils.getRelativePathOfReference(currentPathOfReferencingFile, brokenReference.referencedFile, parser.existingFiles);
			correctedPath = path.resolve(originalDirOfMovedReferencingFile, relativePathOfBrokenReference);
		}
		return correctedPath;
	}

};

module.exports = {
	getReferences: parser.getReferences,
	getBrokenReferences: parser.getBrokenReferences,
	getAll: parser.getAll,
	getNumberOfFilesToFix: parser.getNumberOfFilesToFix,
	getReferencesWithMultiplePossibleCorrections: parser.getReferencesWithMultiplePossibleCorrections,
	getReport: parser.getReport
};