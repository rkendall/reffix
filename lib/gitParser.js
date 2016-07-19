var execa = require('execa');
var path = require('path');

var config = require('./config');

var gitParser = {

	getHistory: function() {
		var self = this;
		return this.getStatus().then(function(statusData) {
			return self.parseStatus(statusData);
		});
	},

	// PRIVATE METHODS
	
	getStatus: function() {
		var workingDir = config.get().workingDir;
		var options = [
			'--git-dir=' + path.join(workingDir, '/.git'),
			'--work-tree=' + workingDir,
			'status',
			'--porcelain'
		];
		return execa('git', options)
			.then(function(result) {
				return result.stdout;
			})
			.catch(function(err) {
				console.error(err.message, err.stack);
				return err;
			});
	},
	
	parseStatus(status) {
		var renamedFiles = {};
		var workingDir = config.get().workingDir;
		var modifiedFilePattern = /(?:^|\n)R  (.+?) -> ([^\n]+)/g;
		var match;
		while ((match = modifiedFilePattern.exec(status)) !== null) {
			var oldPath = path.resolve(workingDir, match[1].replace(/['"]/g, ''));
			var newPath = path.resolve(workingDir, match[2].replace(/['"]/g, ''));
			renamedFiles[oldPath] = newPath;
		}
		return renamedFiles;
	}

};

module.exports = {
	getHistory: gitParser.getHistory.bind(gitParser)
};