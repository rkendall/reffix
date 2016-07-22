var expect = require('chai').expect;

var config = require('../lib/config');
var parser = require('../lib/parser');
var reporter = require('../lib/reporter');

describe('Reports', function() {
	var filesCheckedReport;
	var referencingFilesReport;
	var options = {
		workingDirectory: 'test/files/modules/original',
		referencingFileFilter: ['*.js'],
		referencedFileFilter: ['*.js']
	};
	beforeEach(function(done) {
		config.forceSet(options);
		parser.getAll()
			.then(function(fileData) {
				filesCheckedReport = reporter.reportFilesChecked(fileData);
				var reportOptions = {referencingFiles: true};
				referencingFilesReport = reporter.getReport(fileData, reportOptions);
				done();
			});
	});
	it('Should report correct number of files checked', function() {
		expect(filesCheckedReport).to.contain('12 files');
	});

});