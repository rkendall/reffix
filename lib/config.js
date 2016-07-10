'use strict';

var fs = require('fs');
var deepcopy = require('deepcopy');

var baseSettings = require('../config.json');
var rc = require('rc')('depdoc');
var reporter = require('./reporter');

var self;

var config = self = {
	
	settings: null,
	mode: null,

	get: function() {
		var settings = deepcopy(self.settings);
		return settings[self.mode];
	},

	// TODO Make this into subroutines
	set: function(options, pathOfCustomConfigFile) {
		if (pathOfCustomConfigFile) {
			self.addSettingsGroup(self.settings, pathOfCustomConfigFile);
		}
		if (options) {
			var settings = self.get();
			if (options.workingDir) {
				settings.workingDir = options.workingDir.replace('{{CWD}}', process.cwd());
			}
			if (options.directoryFilter) {
				// TODO Avoid adding duplicates to array
				settings.directoryFilter = settings.directoryFilter.concat(options.directoryFilter);
			}
			if (options.referencingFileFilter) {
				settings.referencingFileFilter = options.referencingFileFilter.slice();
			}
			if (options.referencedFileFilter) {
				settings.referencedFileFilter = options.referencedFileFilter.slice();
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
		var pathOfRcFile = rc.config;
		self.addSettingsGroup(baseSettings, pathOfRcFile);


		// var allSettings = deepcopy(baseSettings);
		// var pathOfRcFile = rc.config;
		// allSettings = self.mergeRc(allSettings, pathOfRcFile);
		// allSettings = self.replaceVariables(allSettings);
		// allSettings = self.mergeModesWithDefault(allSettings);
		// self.settings = allSettings;
	},

	addSettingsGroup: function(settingsGroupToAdd, pathOfRcFile) {
		var settingsGroup = deepcopy(settingsGroupToAdd);
		settingsGroup = self.mergeRc(settingsGroup, pathOfRcFile);
		settingsGroup = self.replaceVariables(settingsGroup);
		settingsGroup = self.mergeModesWithDefault(settingsGroup);
		self.settings = settingsGroup;
	},

	mergeModesWithDefault: function(settings) {
		var newSettings = deepcopy(settings);
		for (var mode in newSettings) {
			if (mode !== 'default') {
				newSettings[mode] = Object.assign({}, deepcopy(newSettings.default), newSettings[mode]);
			}
		}
		return newSettings;
	},

	mergeRc: function(allSettings, pathOfRcFile) {
		// TODO should have error message
		var customSettings = pathOfRcFile
			? JSON.parse(fs.readFileSync(pathOfRcFile, 'utf8'))
			: null;
		if (!customSettings) {
			return allSettings;
		}
		var newSettings = deepcopy(allSettings);
		for (var mode in customSettings) {
			newSettings[mode] = Object.assign({}, newSettings[mode], deepcopy(customSettings[mode]));
		}
		return newSettings;
	},
	
	replaceVariables: function(settings) {
		for (var mode in settings) {
			var settingsForMode = settings[mode];
 			if (settingsForMode.workingDir === '{{CWD}}') {
				settingsForMode.workingDir = process.cwd();
			}
		}
		return settings;
	},

	isModeValid: function(mode) {
		var validModes = Object.keys(self.settings);
		return validModes.indexOf(mode) !== -1;
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