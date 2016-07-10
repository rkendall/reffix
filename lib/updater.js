'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var XRegExp = require('../vendor/xregexp-all');

var config = require('./config');
var parser = require('./parser');
var utils = require('./utils');

var updater = {

	fixReferences: function() {
		return parser.getBrokenReferences()
			.then(function(result) {
				return updater.update(result.brokenReferences, result.existingFiles);
			}).catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	update: function(brokenReferences, existingFiles) {
		var filesToFix = updater.getFilesToFix(brokenReferences, existingFiles);
		return updater.correctReferences(filesToFix)
			.then(function(namesArrayOfFilesFixed) {
				return namesArrayOfFilesFixed;
			}).catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},

	getFilesToFix: function(brokenReferences, existingFiles) {
		var filesToFix = {};
		brokenReferences.forEach(function(brokenReference) {
			if (!brokenReference.correctPath || !brokenReference.isWithinScope) {
				return;
			}
			brokenReference.referencingFiles.forEach(function(pathOfReferencingFile) {
				var relativePathImported = utils.getRelativePathOfReference(pathOfReferencingFile, brokenReference.referencedFile, existingFiles);
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
		var promises = [];
		if (Object.keys(filesToFix).length) {
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
								deferred.resolve(pathOfFileToFix);
							} else {
								deferred.reject('Error writing updated file: ' + pathOfFileToFix + ' -- ' + err.message);
								console.error('Error writing updated file ', err);
							}
						});
					} else {
						deferred.reject('Couldn\'t read file: ' + pathOfFileToFix + ' -- ' + err.message);
					}
				});
			});
			return Q.allSettled(promises)
				.then(function(results) {
					var namesArrayOfFixedFiles = results.map(function(result) {
						return result.value || result.reason;
					});
					return namesArrayOfFixedFiles;
				})
				.catch(function(err) {
					console.log(err.message, err.stack);
					return err;
				});
		} else {
			return Q([]);
		}
	},

	// PRIVATE METHODS

	replaceImportStringInFile: function(fileContent, searchString, replacementString) {
		var searchPatterns = utils.getSearchPatterns(searchString, config.get());
		var correctedFileContent = fileContent;
		searchPatterns.forEach(function(searchPattern) {
			correctedFileContent = correctedFileContent.replace(searchPattern, function(match) {
				return match.replace(searchString, replacementString);
			});
		});
		return correctedFileContent;
	}

};

module.exports = {
	update: updater.update,
	getFilesToFix: updater.getFilesToFix,
	correctReferences: updater. correctReferences
};