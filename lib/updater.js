'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var qe = require('./qExtensions');
var XRegExp = require('../vendor/xregexp-all');

var utils = require('./utils');
var config = require('./config');
var parser = require('./parser');

var updater = {

	fixReferences: function() {
		var self = this;
		return parser.getBrokenReferences()
			.then(function(result) {
				return self.update(result.brokenReferences);
			})
			.handleError();
	},

	update: function(brokenReferences) {
		var self = this;
		var filesToFix = self.getFilesToFix(brokenReferences);
		return self.correctReferences(filesToFix)
			.then(function(namesArrayOfFilesFixed) {
				return namesArrayOfFilesFixed;
			})
			.handleError();
	},

	getFilesToFix: function(brokenReferences) {
		var filesToFix = {};
		brokenReferences.forEach(function(brokenReference) {
			if (!brokenReference.correctPath) {
				return;
			}
			// TODO Make this a subroutine called getRelativePathsForFilesToFix
			brokenReference.referencingFiles.forEach(function(pathOfReferencingFile) {
				var relativePathImported = parser.getRelativePathOfReference(pathOfReferencingFile, brokenReference.referencedFile);
				var correctedRelativePath = utils.getRelativePathFromAbsolutePath(pathOfReferencingFile, brokenReference.correctPath, config.get().currentDirectoryPrefix);
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
		var self = this;
		var promises = [];
		if (Object.keys(filesToFix).length) {
			Object.keys(filesToFix).forEach(function(pathOfFileToFix) {
				var deferred = Q.defer();
				promises.push(deferred.promise);
				// TODO Use a promise here
				fs.readFile(pathOfFileToFix, 'utf8', function(err, fileContent) {
					if (!err) {
						var referencesToFix = filesToFix[pathOfFileToFix].referencesToFix;
						var correctedFileContent = fileContent;
						referencesToFix.forEach(function(referenceToFix) {
							correctedFileContent = self.replaceImportStringInFile(correctedFileContent, referenceToFix.relativePathImported, referenceToFix.correctedRelativePath);
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
				.handleError();
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
	fixReferences: updater.fixReferences.bind(updater),
	update: updater.update.bind(updater),
	getFilesToFix: updater.getFilesToFix.bind(updater),
	correctReferences: updater. correctReferences.bind(updater)
};