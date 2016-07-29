'use strict';

var execa = require('execa');
var path = require('path');
// parser must be loaded at runtime because it calls gitParser,
// which then calls parser; must ensure that parser has finished loading
// before it is called by gitParser
var parser;

var utils = require('./utils');
var config = require('./config');

var gitParser = {

	renamedFiles: {},

	parse: function() {
		var self = this;
		this.loadParser();
		return this.getStatus().then(function(statusData) {
			if (statusData) {
				self.renamedFiles = self.parseStatus(statusData);
				return true;
			}
			return false;
		});
	},

	getCorrectedPathFromGit: function(brokenReference) {
		// If referencing file was moved
		var originalPathBeforeReferencingFileWasMoved = this.getCorrectedPathIfReferencingFileWasMoved(brokenReference);
		var pathToCheckToSeeIfReferencedFileWasMoved = originalPathBeforeReferencingFileWasMoved || brokenReference.referencedFile;
		// If referenced file was moved
		var originalPathBeforeReferencedFileWasMoved = this.getCorrectedPathIfReferencedFileWasMoved(pathToCheckToSeeIfReferencedFileWasMoved);
		var correctedPath = originalPathBeforeReferencedFileWasMoved || originalPathBeforeReferencingFileWasMoved || null;
		return correctedPath;
	},

	loadParser: function() {
		parser = require('./parser');
	},
	
	getStatus: function() {
		var workingDirectory = config.get().workingDirectory;
		var options = [
			'--git-dir=' + path.join(workingDirectory, '/.git'),
			'--work-tree=' + workingDirectory,
			'status',
			'--porcelain'
		];
		return execa('git', options)
			.then(function(result) {
				return result.stdout;
			})
			.catch(function() {
				return null;
			});
	},
	
	parseStatus: function(status) {
		var renamedFiles = {};
		var workingDirectory = config.get().workingDirectory;
		var modifiedFilePattern = /(?:^|\n)R[ A-Z] (.+?) -> ([^\n]+)/g;
		var match;
		while ((match = modifiedFilePattern.exec(status)) !== null) {
			var oldPath = path.resolve(workingDirectory, match[1].replace(/['"]/g, ''));
			var newPath = path.resolve(workingDirectory, match[2].replace(/['"]/g, ''));
			renamedFiles[oldPath] = newPath;
		}
		return renamedFiles;
	},

	getCorrectedPathIfReferencingFileWasMoved: function(brokenReference) {
		var pathOfFirstReferencingFile = brokenReference.referencingFiles[0];
		var originalPathOfReferencingFile = this.getOriginalPath(pathOfFirstReferencingFile);
		if (originalPathOfReferencingFile) {
			var referencedPath = brokenReference.referencedFile;
			var relativePathOfBrokenReference = parser.getRelativePathOfReference(pathOfFirstReferencingFile, referencedPath);
			var referencedPathBeforeFileWasMoved = utils.getAbsolutePathFromRelativePath(originalPathOfReferencingFile, relativePathOfBrokenReference);
			return referencedPathBeforeFileWasMoved;
		}
		return null;
	},

	getCorrectedPathIfReferencedFileWasMoved: function(referencedPath) {
		var pathOfRenamedFile = this.renamedFiles[referencedPath];
		return pathOfRenamedFile || null;
	},

	getOriginalPath: function(renamedPathToFind) {
		for (var originalPath in this.renamedFiles) {
			var renamedPath = this.renamedFiles[originalPath];
			if (renamedPath === renamedPathToFind) {
				return originalPath;
			}
		}
		return null;
	}

};

module.exports = {
	parse: gitParser.parse.bind(gitParser),
	getCorrectedPathFromGit: gitParser.getCorrectedPathFromGit.bind(gitParser)
};