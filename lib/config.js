'use strict';

var fs = require('fs');
var path = require('path');
var deepcopy = require('deepcopy');

var baseSettings = require('../config.json');
var rc = require('rc')('reffix');
var reporter = require('./reporter');

var config = {
	
	settings: null,
	mode: null,

	get: function() {
		var settings = deepcopy(this.settings);
		return settings[this.mode];
	},

	// TODO Make this into subroutines
	set: function(optionsFromCommandLine, pathOfCustomConfigFile) {
		if (pathOfCustomConfigFile) {
			this.addSettingsGroup(this.settings, pathOfCustomConfigFile);
		}
		if (optionsFromCommandLine) {
			if (optionsFromCommandLine.mode) {
				this.setMode(optionsFromCommandLine.mode);
			}
			var settings = this.get();
			if (optionsFromCommandLine.workingDir) {
				var workingDir = path.resolve(process.cwd(), optionsFromCommandLine.workingDir);
				settings.workingDir = workingDir;
			}
			if (optionsFromCommandLine.directoryFilter) {
				// TODO Avoid adding duplicates to array
				settings.directoryFilter = settings.directoryFilter.concat(optionsFromCommandLine.directoryFilter);
			}
			if (optionsFromCommandLine.referencingFileFilter && optionsFromCommandLine.referencingFileFilter.length) {
				settings.referencingFileFilter = optionsFromCommandLine.referencingFileFilter.slice();
			}
			if (optionsFromCommandLine.referencedFileFilter && optionsFromCommandLine.referencedFileFilter.length) {
				settings.referencedFileFilter = optionsFromCommandLine.referencedFileFilter.slice();
			}
			this.settings[this.mode] = settings;
		}
	},

	forceSet: function(options) {
		if (options) {
			this.settings[this.mode] = Object.assign(this.settings[this.mode], options);
		}
	},

	getMode: function() {
		return this.mode;
	},

	setMode: function(mode) {
		if (!this.isModeValid(mode)) {
			reporter.error('Illegal mode value: ' + mode);
			process.exit();
		} else {
			this.mode = mode;
		}
	},

	reset: function() {
		this.init();
	},

	// PRIVATE METHODS

	init: function() {
		this.mode = 'default';
		var pathOfRcFile = rc.config;
		this.addSettingsGroup(baseSettings, pathOfRcFile);
	},

	addSettingsGroup: function(settingsGroupToAdd, pathOfRcFile) {
		var settingsGroup = deepcopy(settingsGroupToAdd);
		settingsGroup = this.mergeRc(settingsGroup, pathOfRcFile);
		settingsGroup = this.replaceVariables(settingsGroup);
		settingsGroup = this.mergeModesWithDefault(settingsGroup);
		this.settings = settingsGroup;
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
			// Set '.' or './' to cwd
			if (/\.\/?/.test(settingsForMode.workingDir)) {
				settingsForMode.workingDir = process.cwd();
			}
		}
		return settings;
	},

	isModeValid: function(mode) {
		var validModes = Object.keys(this.settings);
		return validModes.indexOf(mode) !== -1;
	}

};

config.init();

module.exports = {
	get: config.get.bind(config),
	set: config.set.bind(config),
	forceSet: config.forceSet.bind(config),
	getMode: config.getMode.bind(config),
	setMode: config.setMode.bind(config),
	reset: config.reset.bind(config)
};