'use strict';

var parser = require('./lib/parser');
var updater = require('./lib/updater');
var prompter = require('./lib/prompter');

module.exports = {
	prompt: prompter.start,
	fixReferences: updater.fixReferences,
	getReport: parser.getReport,
	getBrokenReferences: parser.getBrokenReferences,
	getReferences: parser.getReferences,
	getAll: parser.getAll
};