'use strict';

var clc = require('cli-color');
var self;

var reporter = self = {
	
	indent: '   ',

	showReport: function(report) {
		if (report) {
			console.log(report + '\n');
		}
	},

	reportFilesChecked: function(fileData) {
		var message = '';
		var numberOfFilesChecked = Object.keys(fileData.existingFiles).length;
		if (numberOfFilesChecked > 1) {
			message = numberOfFilesChecked + ' files checked';
		} else if (numberOfFilesChecked === 1) {
			message = '1 file checked';
		} else {
			message = 'No files to check'
		}
		return message + ' for broken references';
	},

	getReport: function(fileData, options) {
		var messages = [];
		if (options.referencingFiles) {
			messages = messages.concat(self.reportReferences(fileData));
		}
		if (options.brokenReferences) {
			messages = messages.concat(self.reportBrokenReferences(fileData));
		}
		return messages.join('\n');
	},

	reportFilesUpdated: function(messages) {
		if (messages.length) {
			messages.unshift(clc.green.bold('\nFiles updated to correct references:'));
			return messages.join('\n') + '\n';
		} else {
			return '';
		}
	},

	// PRIVATE METHODS

	reportReferences: function(fileData) {
		var referencingFiles = fileData.referencingFiles;
		var numberOfReferencingFiles = Object.keys(referencingFiles).length;
		var messages = [''];
		if (numberOfReferencingFiles) {
			var message = (numberOfReferencingFiles === 1) ? '1 file contains references\n' : numberOfReferencingFiles + ' files contain references\n';
			messages.push(clc.bold(message));
			for (var referencingFilePath in referencingFiles) {
				messages.push(clc.bold('File Containing Reference(s): ') + referencingFilePath);
				messages.push(clc.bold(self.indent + 'Files Referenced'));
				var referencedFiles = referencingFiles[referencingFilePath];
				messages = messages.concat(self.formatFileList(referencedFiles));
				messages.push('');
			}
		} else {
			messages.push(clc.bold('No files contain references'));
		}
		messages.push('');

		return messages;

	},

	reportBrokenReferences: function(fileData) {
		var brokenReferences = fileData.brokenReferences;
		var messages = [];
		if (brokenReferences.length) {
			brokenReferences.forEach(function(brokenReference) {
				if (!brokenReference.isWithinScope) {
					messages.push(clc.red.bold('Unchecked Reference: ') + clc.red(brokenReference.referencedFile));
					messages.push(clc.red('File lies outside specified scope'));
				} else {
					messages.push(clc.red.bold('Broken Reference:    ') + clc.red(brokenReference.referencedFile));
					if (brokenReference.correctPath) {
						messages.push(clc.green.bold('Corrected Reference: ') + clc.green(brokenReference.correctPath));
					} else if (brokenReference.possibleCorrectPaths.length > 1) {
						messages.push(clc.red.bold('Couldn\'t determine correct reference from among these possibilities:'));
						messages.push(clc.red(brokenReference.possibleCorrectPaths.join('\n')));
					} else {
						messages.push(clc.green.bold('Corrected Reference: ') + clc.red('Couldn\'t determine correct reference'));
					}
				}
				messages.push(clc.bold('Files Containing Broken Reference:'));
				brokenReference.referencingFiles.forEach(function(referencingFilePath) {
					messages.push('   ' + referencingFilePath);
				});
				messages.push('');
			});
		} else {
			messages.push(clc.green.bold('No broken references found\n'));
		}
		return messages;
	},

	formatFileList: function(fileList) {
		var messages = [];
		fileList.forEach(function(file) {
			messages.push(self.indent + file.absoluteReference);
		});
		return messages;
	}

};

module.exports = {
	showReport: reporter.showReport,
	reportFilesChecked: reporter.reportFilesChecked,
	getReport: reporter.getReport,
	reportFilesUpdated: reporter.reportFilesUpdated
};