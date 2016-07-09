var expect = require('chai').expect;
var parser = require('../lib/parser');
var reporter = require('../lib/reporter');

describe('Reports', function() {
	var filesCheckedReport;
	var referencingFilesReport;
	var processingOptions = {
		workingDir: 'test/fixtures/original',
		referencingFileFilter: ['*.js'],
		referencedFileFilter: ['*.js']
	};
	beforeEach(function(done) {
		parser.getAll(processingOptions)
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