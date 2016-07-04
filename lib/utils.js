'use strict';

var path = require('path');
var minimatch = require('minimatch');
var XRegExp = require('xregexp');

var utils = {

	getSearchPattern: function(replacementString, options) {
		var specificReplacementPattern = replacementString
			? replacementString.replace(/\./g, '\\.').replace(/\//g, '\\/')
			: '(' + options.replacementPattern + ')';
		var patternString = ('(' + options.searchPatterns.join('|') + ')').replace(/%%/g, specificReplacementPattern);
		return XRegExp(patternString, 'g');
	},

	getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
		var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
		var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
		var absolutePathOfReferenceWithFileExtension = this.restoreJsFileExtension(absolutePathOfReference);
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
		return existingFiles.hasOwnProperty(filePath);
	},

	isFileIncluded: function(filePath, globArray) {
		var filename = path.basename(filePath);
		return globArray.some(function(globPattern) {
			return minimatch(filename, globPattern);
		});
	},

	restoreJsFileExtension: function(filePath) {
		var supportedFileExtensionPattern = /\.(js|jsx|json)$/;
		if (!supportedFileExtensionPattern.test(filePath)) {
			filePath += '.js';
		}
		return filePath;
	},

	mergeArrays: function(array1, array2) {
		array2.forEach(function(value) {
			if (array1.indexOf(value) === -1) {
				array1.unshift(value);
			}
		});
		return array1;
	}

};

module.exports = utils;