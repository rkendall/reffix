'use strict';

var config = {

	default: {
		workingDir: process.cwd(),
		//workingDir: '/Users/robertkendall/code/react/test',
		directoryFilter: [
			'!.git',
			'!node_modules',
			'!.idea'
		],
		referencingFileFilter: [
			'*.js',
			'*.jsx'
		],
		referencedFileFilter: [
			'*.js',
			'*.jsx',
			'*.json'
		],
		searchPatterns: [
			'(^|\\s)import (\\S+|\{[^}]+\}) from %%',
			'(^|[^\\w-])require\\(%%\\)'
//				'(^|\\s)(var|let|const) \\S+ = require\\(%%\\)'
		],
		//replacementPattern: '(\'")(\\.+/[^"\'\\s]+)\\1'
		replacementPattern: '\'"(\\.+/[^"\'\\s]+)"|\'(\\.+/[^"\'\\s]+)\''
	}

};

module.exports = config;