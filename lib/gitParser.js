var simpleGit = require('simple-git');
var git;

var config = require('./config');

var gitParser = {

	getHistory: function() {
		this.init();
		git.status(function(result) {
			console.log(result);
		});
	},

	init: function(workingDir) {
		git = simpleGit(config.get().workingDir);
	}

};

module.exports = {
	getHistory: gitParser.getHistory.bind(gitParser)
};