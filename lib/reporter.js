'use strict';

var clc = require('cli-color');

var reporter = {
	
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
			message = numberOfFilesChecked + ' files parsed';
		} else if (numberOfFilesChecked === 1) {
			message = '1 file parsed';
		} else {
			message = 'No files to parse'
		}
		return message;
	},

	getReport: function(fileData, options) {
		var self = this;
		var messages = [];
		if (options.referencingFiles) {
			messages = messages.concat(self.reportReferences(fileData, 'referencingFiles'));
		}
		if (options.referencedFiles) {
			messages = messages.concat(self.reportReferences(fileData, 'referencedFiles'));
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
	
	error: function(message) {
		console.error(clc.red('\n' + message + '\n'));
	},

	// PRIVATE METHODS

	reportReferences: function(fileData, fileType) {
		var self = this;
		var headingsByFileType = {
			referencingFiles: {
				countSingular: '1 file contains references',
				countPlural: ' files contain references',
				mainFile: 'File Containing Reference(s)',
				subFiles: 'Files Referenced',
				noFiles: 'No files contain references'
			},
			referencedFiles: {
				countSingular: '1 file is referenced by other files',
				countPlural:  ' files are referenced by other files',
				mainFile: 'File Referenced',
				subFiles: 'Files Containing Reference',
				noFiles: 'No files are referenced by other files'
			}
		};
		var headings = headingsByFileType[fileType];
		var filesToReport = fileData[fileType];
		var numberOfFilesToReport = Object.keys(filesToReport).length;
		var messages = [''];
		if (numberOfFilesToReport) {
			var message = (numberOfFilesToReport === 1) ? headings.countSingular +'\n' : numberOfFilesToReport + headings.countPlural + '\n';
			messages.push(clc.bold(message));
			for (var pathToReport in filesToReport) {
				messages.push(clc.blue.bold(headings.mainFile + ': ') + clc.blue(pathToReport));
				messages.push(clc.bold(self.indent + headings.subFiles));
				var subFiles = filesToReport[pathToReport];
				messages = messages.concat(self.formatFileList(subFiles, fileType));
				messages.push('');
			}
		} else {
			messages.push(clc.bold(headings.noFiles));
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

	formatFileList: function(fileList, fileType) {
		var self = this;
		var messages = [];
		if (fileType === 'referencingFiles') {
			fileList.forEach(function(file) {
				messages.push(self.indent + file.absoluteReference);
			});
		} else {
			fileList.referencingFiles.forEach(function(filePath) {
				messages.push(self.indent + filePath);
			});
		}
		return messages;
	}

};

module.exports = {
	showReport: reporter.showReport.bind(reporter),
	reportFilesChecked: reporter.reportFilesChecked.bind(reporter),
	getReport: reporter.getReport.bind(reporter),
	reportFilesUpdated: reporter.reportFilesUpdated.bind(reporter),
	error: reporter.error.bind(reporter)
};