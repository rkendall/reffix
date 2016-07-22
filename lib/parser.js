'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var XRegExp = require('../vendor/xregexp-all');
var minimatch = require('minimatch');

var utils = require('./utils');
var config = require('./config');
var gitParser = require('./gitParser');

var parser = {

	existingFiles: {},
	referencedFiles: {},
	brokenReferences: [],
	renamedFiles: {},

	getReferences: function() {
		var self = this;
		return this.getDataFromFiles()
			.then(function(result) {
				var existingFiles = result.existingFiles;
				var referencingFiles = {};
				for (var filePath in existingFiles) {
					var existingFile = existingFiles[filePath];
					if (existingFile.referencedFiles.length) {
						referencingFiles[filePath] = existingFile.referencedFiles;
					}
				}
				self.existingFiles = existingFiles;
				self.referencingFiles = referencingFiles;
				self.referencedFiles = result.referencedFiles;
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
		var self = this;
		var renamedFilesPromise = gitParser.parse();
		var referencesPromise = self.getReferences()
			.then(self.findAndSaveBrokenReferences.bind(self));
		return Q.all([
				renamedFilesPromise,
				referencesPromise
			])
			.then(function() {
				self.getCorrectedPathsForMovedFiles();
				return {
					existingFiles: self.existingFiles,
					brokenReferences: self.brokenReferences
				};
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getAll: function() {
		var self = this;
		return self.getBrokenReferences()
			.then(function() {
				return {
					existingFiles: self.existingFiles,
					referencingFiles: self.referencingFiles,
					referencedFiles: self.referencedFiles,
					brokenReferences: self.brokenReferences
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
			if (brokenReference.correctPath) {
				numberOfFilesToFix += brokenReference.referencingFiles.length;
			}
		});
		return numberOfFilesToFix;
	},

	// PRIVATE METHODS

	getDataFromFiles: function() {
		var self = this;
		var promises = [];
		var existingFiles = {};
		var referencedFiles = {};
		var deferredResult = Q.defer();
		var settings = config.get();
		var fileGlobs = self.getFileFilterGlobs(settings.referencingFileFilter, settings.referencedFileFilter);
		var readFileOptions = {
			root: settings.workingDirectory,
			fileFilter: self.isFileIncluded.bind(self, fileGlobs),
			directoriesToExclude: self.isDirectoryIncluded,
			entryType: 'files'
		};
		console.log('\nParsing files in ' + readFileOptions.root);
		readdirp(readFileOptions)
			.on('data', function(item) {
				var path = item.fullPath;
				var deferred = Q.defer();
				promises.push(deferred.promise);
				fs.readFile(path, 'utf8', function(err, fileContent) {
					if (!err) {
						var result = self.getReferencesWithinFile(path, fileContent, referencedFiles);
						Object.assign(existingFiles, result.existingFiles);
						referencedFiles = result.referencedFiles;
						deferred.resolve();
					} else {
						console.error('Error reading file: ', err);
					}
				});
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

	// Use all filtering criteria for referencing files. Use only inclusion criteria
	// for referenced files, otherwise would filter out referencing files too.
	// Referenced files excluded now will be picked up during the reference check.
	// If no inclusion criteria for referencing files, assume *.*
	getFileFilterGlobs: function(referencingFileFilter, referencedFileFilter) {
		var referencingFileInclusions = utils.filterGlobs(referencingFileFilter, 'inclusion');
		if (!referencingFileInclusions.length) {
			referencingFileInclusions = ['*.*'];
		}
		// TODO Should remove duplicates
		var globsToUse = [].concat(
			referencingFileInclusions,
			utils.filterGlobs(referencingFileFilter, 'exclusion'),
			utils.filterGlobs(referencedFileFilter, 'inclusion')
		);
		return globsToUse;
	},

	isDirectoryIncluded: function(item) {
		var dirName = item.name;
		var settings = config.get();
		var isDirectoryExcluded = settings.directoriesToExclude.some(function(globPattern) {
			return minimatch(dirName, globPattern);
		});
		return !isDirectoryExcluded;
	},

	isFileIncluded: function(globs, item) {
		var filename = item.name;
		return utils.isFileIncluded(filename, globs);
	},

	getReferencesWithinFile: function(pathOfFileContainingReference, fileContent, referencedFiles) {
		var self = this;
		var settings = config.get();
		var existingFiles = {};
		existingFiles[pathOfFileContainingReference] = {referencedFiles: []};
		if (utils.isFileIncluded(pathOfFileContainingReference, settings.referencingFileFilter)) {
			var patterns = utils.getSearchPatterns(null, settings);
			patterns.forEach(function(pattern) {
				var match;
				var pos = 0;
				var cleanedContent = self.removeExcludedText(fileContent);
				while (match = XRegExp.exec(cleanedContent, pattern, pos)) {
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

	removeExcludedText: function(fileContent) {
		var cleanedContent = fileContent;
		var settings = config.get();
		settings.textToExclude.forEach(function(patternStr) {
			var pattern = new RegExp(patternStr, 'g');
			cleanedContent = cleanedContent.replace(pattern, '')
		});
		return cleanedContent;
	},

	findAndSaveBrokenReferences: function() {
		var self = this;
		var promises = [];
		self.brokenReferences = [];
		Object.keys(self.referencedFiles).forEach(function(pathOfReferencedFile) {
			var deferred = Q.defer();
			promises.push(deferred.promise);
			utils.doesFileExist(pathOfReferencedFile, self.existingFiles)
				.then(function(isExtant) {
					if (!isExtant) {
						var referencingFiles = self.referencedFiles[pathOfReferencedFile].referencingFiles;
						var brokenReference = {
							referencedFile: pathOfReferencedFile,
							referencingFiles: referencingFiles,
							possibleCorrectPaths: []
						};
						self.brokenReferences.push(brokenReference);
					}
					deferred.resolve();
				})
				.catch(function(err) {
					console.error(err.message, err.stack);
					return err;
				});
		});
		return Q.all(promises);
	},

	getCorrectedPathsForMovedFiles: function() {
		var self = this;
		self.brokenReferences.forEach(function(brokenReference) {
			var correctedPath = gitParser.getCorrectedPathFromGit(brokenReference.referencedFile);
			if (correctedPath) {
				brokenReference.correctPath = correctedPath;
			} else {
				brokenReference = gitParser.getCorrectedPathForRenamedFile(brokenReference);
			}
			if (!brokenReference.correctPath) {
				brokenReference = self.determineCorrectPathForReference(brokenReference);
			}
		});
		// Must be run after all references are corrected because it depends upon corrected references
		self.brokenReferences.forEach(function(brokenReference) {
			if (brokenReference.possibleCorrectPaths.length > 1) {
				brokenReference.correctPath = self.getCorrectPathForDuplicateFilename(brokenReference);
			}
		});
	},

	// Not currently used
	getOriginalPath: function(renamedPathToFind) {
		for (var originalPath in this.renamedFiles) {
			var renamedPath = this.renamedFiles[originalPath];
			if (renamedPath === renamedPathToFind) {
				return originalPath;
			}
		}
		return null;
	},

	determineCorrectPathForReference: function(brokenReference) {
		var filePathOfBrokenReference = brokenReference.referencedFile;
		var filenameOfBrokenReference = path.basename(filePathOfBrokenReference);
		for (var pathOfExistingFile in this.existingFiles) {
			var nameOfExistingFile = path.basename(pathOfExistingFile);
			// If the filename of the broken reference matches the filename of an existing file
			// the path of the existing file must be the new location of the file in the broken reference
			if (filenameOfBrokenReference === nameOfExistingFile) {
				brokenReference.possibleCorrectPaths.push(pathOfExistingFile);
			}
		}
		if (brokenReference.possibleCorrectPaths.length === 1 && !brokenReference.correctPath) {
			brokenReference.correctPath = brokenReference.possibleCorrectPaths[0];
		}
		return brokenReference;
	},

	getCorrectPathForDuplicateFilename: function(brokenReference) {
		var self = this;
		var movedReferencingFile;
		var currentPathOfReferencingFile;
		// Get path of file that was moved and references the duplicate filename
		brokenReference.referencingFiles.some(function(pathOfReferencingFile) {
			self.brokenReferences.some(function(brokenReferenceToCheck) {
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
			var relativePathOfBrokenReference = utils.getRelativePathOfReference(currentPathOfReferencingFile, brokenReference.referencedFile, self.existingFiles);
			correctedPath = path.resolve(originalDirOfMovedReferencingFile, relativePathOfBrokenReference);
		}
		return correctedPath;
	}

};

module.exports = {
	getReferences: parser.getReferences.bind(parser),
	getBrokenReferences: parser.getBrokenReferences.bind(parser),
	getAll: parser.getAll.bind(parser),
	getNumberOfFilesToFix: parser.getNumberOfFilesToFix.bind(parser),
	getReferencesWithMultiplePossibleCorrections: parser.getReferencesWithMultiplePossibleCorrections.bind(parser)
};