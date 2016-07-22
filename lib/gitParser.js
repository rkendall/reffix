var execa = require('execa');
var path = require('path');

var config = require('./config');

var gitParser = {

	renamedFiles: {},

	parse: function() {
		var self = this;
		return this.getStatus().then(function(statusData) {
			if (statusData) {
				self.renamedFiles = self.parseStatus(statusData);
				return true;
			}
			return false;
		});
	},

	getCorrectedPathFromGit: function(pathOfbrokenReference) {
		return this.renamedFiles[pathOfbrokenReference] || null;
	},

	getCorrectedPathForRenamedFile: function(brokenReference) {
		var self = this;
		var originalFilenameToFind = path.basename(brokenReference.referencedFile);
		Object.keys(this.renamedFiles).forEach(function(originalPath) {
			var originalFilename = path.basename(originalPath);
			if (originalFilenameToFind === originalFilename) {
				var newPath = self.renamedFiles[originalPath];
				brokenReference.possibleCorrectPaths.push(newPath);
			}
		});
		if (brokenReference.possibleCorrectPaths.length === 1) {
			brokenReference.correctPath = brokenReference.possibleCorrectPaths[0];
		}
		return brokenReference;
	},

	// PRIVATE METHODS
	
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
	
	parseStatus(status) {
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
	}

};

module.exports = {
	parse: gitParser.parse.bind(gitParser),
	getCorrectedPathFromGit: gitParser.getCorrectedPathFromGit.bind(gitParser),
	getCorrectedPathForRenamedFile: gitParser.getCorrectedPathForRenamedFile.bind(gitParser)
};