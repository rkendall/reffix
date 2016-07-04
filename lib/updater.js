'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var Q = require('q');
var XRegExp = require('../vendor/xregexp-all');

var config = require('./config').default;
var parser = require('./parser');

var updater = {

	fixReferences: function(options) {
		if (options) {
			Object.assign(config, options);
		}
		return parser.getBrokenReferences(options)
			.then(function(brokenReferences) {
				return updater.update(brokenReferences);
			});
	},

	update: function(brokenReferences) {
		var filesToFix = updater.getFilesToFix(fixedReferences);
		return updater.correctReferences(filesToFix)
			.then(function(results) {
				return results.map(function(result) {
					return result.value || result.reason;
				});
			});
	},

	getFilesToFix: function(brokenReferences) {
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
				return results.map(function(result) {
					return result.value || result.reason;
				});
			});
	},

	// PRIVATE FUNCTIONS

	replaceImportStringInFile: function(fileContent, searchString, replacementString) {
		var searchPattern = utils.getSearchPatterns(searchString, config);
		var correctedFileContent = fileContent.replace(searchPattern, function(match) {
			return match.replace(searchString, replacementString);
		});
		return correctedFileContent;
	}

};

module.exports = {
	update: updater.update,
	getFilesToFix: updater.getFilesToFix,
	correctReferences: updater. correctReferences
};