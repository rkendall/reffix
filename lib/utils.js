'use strict';

var path = require('path');

var utils = {

	getSearchPattern: function(replacementString, options) {
		var generalReplacementPattern = '("%%"|\'%%\')';
		var specificReplacementPattern = replacementString ? replacementString.replace(/\./g, '\\.').replace(/\//g, '\\/') : '\\.+\\/[^"\'\\s]+';
		var replacementPattern = generalReplacementPattern.replace(/%%/g, specificReplacementPattern);
		var patternString = ('(' + options.searchPatterns.join('|') + ')').replace(/%%/g, replacementPattern);
		return new RegExp(patternString, 'g');
	},

	getAbsolutePathFromRelativePath: function(pathOfFileContainingReference, relativePathOfReference) {
		var dirOfFileContainingReference = path.dirname(pathOfFileContainingReference);
		var absolutePathOfReference = path.resolve(dirOfFileContainingReference, relativePathOfReference);
		var absolutePathOfReferenceWithFileExtension = this.restoreFileExtension(absolutePathOfReference);
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

	doesFileHaveSupportedExtension: function(filePath) {
		var pattern = /\.(js|jsx|json)$/;
		return pattern.test(filePath);
	},

	restoreFileExtension: function(filePath) {
		if (!this.doesFileHaveSupportedExtension(filePath)) {
			filePath += '.js';
		}
		return filePath;
	}

};

module.exports = utils;