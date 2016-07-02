'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');

var utils = require('./utils');
var config = require('./config');

var parser = {

	existingFiles: {},
	referencedFiles: {},
	brokenReferences: [],

	getReferences: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		var self = this;
		var promises = [];
		var existingFiles = {};
		var referencedFiles = {};
		var deferredResult = Q.defer();
		var options = {
			root: config.workingDir,
			fileFilter: config.fileFilter,
			directoryFilter: config.directoryFilter,
			entryType: 'files'
		};
		readdirp(options)
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
						parser.existingFiles = existingFiles;
						parser.referencedFiles = referencedFiles;
						deferredResult.resolve({
							existingFiles: existingFiles,
							referencedFiles: referencedFiles
						});
					}).catch(function(err) {
						console.error(err.message, err.stack);
						return err;
					});
			});
		return deferredResult.promise;
	},

	getBrokenReferences: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		return parser.getReferences(options)
			.then(function() {
				parser.findAndSaveBrokenReferences();
				parser.getCorrectedPathsForMovedFiles();
				return parser.brokenReferences;
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getAll: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		return parser.getBrokenReferences(options)
			.then(function() {
				return {
					existingFiles: parser.existingFiles,
					referencedFiles: parser.referencedFiles,
					brokenReferences: parser.brokenReferences
				};
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	// PRIVATE METHODS

	getReferencesWithinFile: function(pathOfFileContainingReference, fileContent, referencedFiles) {
		var existingFiles = {};
		var matches;
		var pattern = utils.getSearchPattern(null, config);
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
			var absolutePathOfReference = utils.getAbsolutePathFromRelativePath(pathOfFileContainingReference, relativePathOfReference);
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


	findAndSaveBrokenReferences: function() {
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
		brokenReference.isWithinScope = utils.isFileInsideDirsToFix(filePathOfBrokenReference, config);
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
	getAll: parser.getAll
};