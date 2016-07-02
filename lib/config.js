'use strict';

var config = {

	//workingDir: process.cwd(),
	workingDir: '/Users/robertkendall/code/react/test',
	directoryFilter: [
		'!.git',
		'!node_modules',
		'!.idea'
	],
	fileFilter: [
		'*.js',
		'*.jsx',
		'*.json'
	],
	searchPatterns: [
		'(^|\\s)import (\\S+|\{[^}]+\}) from %%',
		'(^|\\s)(var|let|const) \\S+ = require\\(%%\\)'
	]

};

module.exports = config;