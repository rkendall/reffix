'use strict';


(function() {

	var fs = require('fs');
	var path = require('path');
	var readdirp = require('readdirp');
	var Q = require('q');

	var parser = {

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

		getReferences: function(options) {
			if (options) {
				Object.assign(parser.config, options);
			}
			var self = this;
			var promises = [];
			var existingFiles = {};
			var referencedFiles = {};
			var deferredResult = Q.defer();
			var options = {
				root: parser.config.workingDir,
				fileFilter: parser.config.supportedExtensions.map(function(extension) {
					return '*.' + extension;
				}),
				directoryFilter: parser.config.directoryFilter,
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
				Object.assign(parser.config, options);
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
				Object.assign(parser.config, options);
			}
			return parser.getBrokenReferences(options)
				.then(function() {
					return {
						existingFiles: parser.existingFiles,
						referencedFiles: parser.referencedFiles,
						brokenReferences: parser.brokenReferences
					};
				});
		},

		// PRIVATE METHODS

		getReferencesWithinFile: function(pathOfFileContainingReference, fileContent, referencedFiles) {
			var existingFiles = {};
			var matches;
			var pattern = parser.getSearchPattern();
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
				var absolutePathOfReference = parser.getAbsolutePathFromRelativePath(pathOfFileContainingReference, relativePathOfReference);
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
				if (!parser.doesFileExist(pathOfReferencedFile)) {
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
			brokenReference.isWithinScope = parser.isFileInsideDirsToFix(filePathOfBrokenReference);
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
				var relativePathOfBrokenReference = parser.getRelativePathOfReference(currentPathOfReferencingFile, brokenReference.referencedFile);
				correctedPath = path.resolve(originalDirOfMovedReferencingFile, relativePathOfBrokenReference);
			}
			return correctedPath;
		},

		// UTILITY FUNCTIONS

		getSearchPattern: function(replacementString) {
			var generalReplacementPattern = '("%%"|\'%%\')';
			var specificReplacementPattern = replacementString ? replacementString.replace(/\./g, '\\.').replace(/\//g, '\\/') : '\\.+\\/[^"\'\\s]+';
			var replacementPattern = generalReplacementPattern.replace(/%%/g, specificReplacementPattern);
			var patternString = ('(' + parser.config.searchPatterns.join('|') + ')').replace(/%%/g, replacementPattern);
			return new RegExp(patternString, 'g');
		},

		getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
			var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
			var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
			var absolutePathOfReferenceWithFileExtension = parser.restoreFileExtension(absolutePathOfReference);
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
			var referencedFile = parser.existingFiles[pathOfReferencingFile].referencedFiles.find(function(referencedFile) {
				return referencedFile.absoluteReference === pathReferenced;
			});
			return referencedFile.relativeReference;
		},

		isFileInsideDirsToFix: function(pathOfReferencedFile) {
			return pathOfReferencedFile.substr(0, parser.config.workingDir.length) === parser.config.workingDir;
		},

		doesFileExist: function(filePath) {
			return parser.existingFiles.hasOwnProperty(filePath);
		},

		// isFileReferenced: function(filePath) {
		// 	return parser.referencedFiles.hasOwnProperty(filePath);
		// },

		doesFileHaveSupportedExtension: function(filePath) {
			var pattern = new RegExp('\\.(' + parser.config.supportedExtensions.join('|') + ')$');
			return pattern.test(filePath);
		},

		restoreFileExtension: function(filePath) {
			if (!parser.doesFileHaveSupportedExtension(filePath)) {
				filePath += '.js';
			}
			return filePath;
		}

	};

	module.exports = {
		getReferences: parser.getReferences,
		getBrokenReferences: parser.getBrokenReferences,
		getAll: parser.getAll
	};

})();