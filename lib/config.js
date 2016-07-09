'use strict';

var config = {

	default: {
		workingDir: process.cwd(),
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
			'(^|\\s)import +([\\w\\-\\{\\}\\, \\*\\$]+ )?([\'"]){{valuePattern}}\\3',
			'(^|[^\\w-])require\\(([\'"]){{valuePattern}}\\2\\)'
//				'(^|\\s)(var|let|const) \\S+ = require\\(([\'"]){{valuePattern}}\\2\\)'
		],
		valuePattern: '\\.+/[^"\'\\s]+'
	}

};

module.exports = config;