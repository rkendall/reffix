'use strict';

var fs = require('fs');
var path = require('path');
var mime = require('mime');
var Q = require('q');
var minimatch = require('minimatch');
var XRegExp = require('../vendor/xregexp-all');

var utils = {

	getSearchPatterns: function(replacementString, options) {
		var valuePattern = replacementString
			? XRegExp.escape(replacementString)
			: options.valuePattern;
		return options.searchPatterns.map(function(generalPattern) {
			return XRegExp.build(generalPattern, {
				valuePattern: XRegExp('(?<value>' + valuePattern + ')')
			}, 'g');
		});
	},

	getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
		var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
		var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
		var absolutePathOfReferenceWithFileExtension = this.restoreJsFileExtension(absolutePathOfReference);
		return absolutePathOfReferenceWithFileExtension;
	},

	getRelativePathFromAbsolutePath: function(pathOfReferencingFile, absolutePathOfReference) {
		var relativeDir = path.relative(path.dirname(pathOfReferencingFile), path.dirname(absolutePathOfReference));
		var relativePath = path.join(relativeDir, path.basename(absolutePathOfReference));
		if (relativePath.substring(0, 1) !== '.') {
			relativePath = './' + relativePath;
		}
		return relativePath;
	},

	getRelativePathOfReference: function(pathOfReferencingFile, pathReferenced, existingFiles) {
		var referencedFile = existingFiles[pathOfReferencingFile].referencedFiles.find(function(referencedFile) {
			return referencedFile.absoluteReference === pathReferenced;
		});
		return referencedFile.relativeReference;
	},

	isFileInsideDirsToFix: function(pathOfReferencedFile, options) {
		return pathOfReferencedFile.substr(0, options.workingDir.length) === options.workingDir;
	},

	doesFileExist: function(filePath, existingFiles) {
		if (existingFiles.hasOwnProperty(filePath)) {
			return Q(true);
		}
		return Q.nfcall(fs.stat, filePath)
			.then(function() {
				return true;
			})
			.catch(function() {
				return false;
			});
	},

	isFileIncluded: function(filePath, globArray) {
		var inclusionGlobs = this.filterGlobs(globArray, 'inclusion');
		var exclusionGlobs = this.filterGlobs(globArray, 'exlusion');
		// One of the inclusion conditions must be met, unless array is empty
		var isInclusionCriteriaMet = false;
		if (inclusionGlobs.length === 0) {
			isInclusionCriteriaMet = true;
		} else {
			isInclusionCriteriaMet = inclusionGlobs.some(function(pattern) {
				return minimatch(filePath, pattern, {matchBase: true});
			});
		}
		if (!isInclusionCriteriaMet) {
			return false;
		}
		if (exclusionGlobs.length === 0) {
			return true;
		}
		// All of the exlcusion conditions must be met
		return exclusionGlobs.every(function(pattern) {
			return minimatch(filePath, pattern, {matchBase: true});
		})
	},

	filterGlobs: function(globs, type) {
		var types = {
			inclusion: true,
			exlusion: false
		};
		var filteredGlobs = [];
		globs.forEach(function(glob) {
			if ((glob.indexOf('!') !== 0) === types[type]) {
				filteredGlobs.push(glob);
			}
		});
		return filteredGlobs;
	},

	restoreJsFileExtension: function(filePath) {
		mime.default_type = 'none';
		var mimeType = mime.lookup(filePath);
		if (mimeType === 'none') {
			filePath += '.js';
		}
		return filePath;
	},

	mergeArrays: function(array1, array2) {
		var mergedArray = array1.slice();
		array2.forEach(function(value) {
			if (array1.indexOf(value) === -1) {
				mergedArray.push(value);
			}
		});
		return mergedArray;
	}

};

module.exports = utils;