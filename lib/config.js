'use strict';

var deepcopy = require('deepcopy');

var baseSettings = require('../config.json');
var reporter = require('./reporter');

var self;

var config = self = {
	
	settings: null,
	mode: null,

	get: function() {
		var settings = deepcopy(self.settings);
		return settings[self.mode];
	},

	set: function(options) {
		if (options) {
			var settings = self.get();
			if (options.workingDir) {
				settings.workingDir = options.workingDir.replace('[CWD]', process.cwd());
			}
			// Convert to array of negating globs
			if (options.directoryFilter) {
				settings.directoryFilter = settings.directoryFilter.concat(processDirectoryFilter(options));
			}
			if (options.referencingFileFilter) {
				settings.referencingFileFilter = options.referencingFileFilter;
			}
			if (options.valuePattern) {
				settings.valuePattern = options.valuePattern;
			}
			self.settings[self.mode] = settings;
		}
	},

	forceSet: function(options) {
		if (options) {
			self.settings[self.mode] = Object.assign(self.settings[self.mode], options);
		}
	},

	getMode: function() {
		return self.mode;
	},

	setMode: function(mode) {
		if (!self.isModeValid(mode)) {
			reporter.error('Illegal mode value: ' + mode);
			process.exit();
		} else {
			self.mode = mode;
		}
	},

	reset: function() {
		self.init();
	},

	// PRIVATE METHODS

	init: function() {
		self.mode = 'default';
		var settings = deepcopy(baseSettings);
		settings = self.replaceVariables(settings);
		settings = self.mergeModesWithDefault(settings);
		self.settings = settings;
	},

	mergeModesWithDefault: function(settings) {
		for (var mode in settings) {
			if (mode !== 'default') {
				settings[mode] = Object.assign({}, deepcopy(settings.default), settings[mode]);
			}
		}
		return settings;
	},
	
	replaceVariables: function(settings) {
		for (var mode in settings) {
			var settingsForMode = settings[mode];
 			if (settingsForMode.workingDir === '[CWD]') {
				settingsForMode.workingDir = process.cwd();
			}
		}
		return settings;
	},

	isModeValid: function(mode) {
		var validModes = Object.keys(self.settings);
		return validModes.indexOf(mode) !== -1;
	},
	
	processDirectoryFilter: function(directoryFilter) {
		directoryFilter.join(',').map(function(dir) {
			return '!' + dir;
		});
	}

};

config.init();

module.exports = {
	get: config.get,
	set: config.set,
	forceSet: config.forceSet,
	getMode: config.getMode,
	setMode: config.setMode,
	reset: config.reset
};