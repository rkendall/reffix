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
			'(^|\\s)import (\\S+|\{[^}]+\}) from ([\'"]){{valuePattern}}\\3',
			'(^|[^\\w-])require\\(([\'"]){{valuePattern}}\\2\\)'
//				'(^|\\s)(var|let|const) \\S+ = require\\(%%\\)'
		],
		replacementPattern: '\\.+/[^"\'\\s]+'
	}

};

module.exports = config;