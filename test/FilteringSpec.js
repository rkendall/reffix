var path = require('path');
var expect = require('chai').expect;

var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Filtering', function() {

	var testWorkingDir = 'test/files/filtering';

	describe('Should filter directories', function() {
		var files;
		var options = {
			workingDirectory: testWorkingDir,
			"directoriesToExclude": [
				".*",
				"node_modules"
			],
			"referencingFileFilter": [
				"*.js",
				"*.jsx"
			],
			"referencedFileFilter": [
				"*.js",
				"*.jsx"
			]
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		afterEach(function() {
			config.reset();
		});
		it('Should get correct number of existing files by filtering directories', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(5);
		});
		it('Should get correct number of referencing files', function() {
			expect(Object.keys(files.referencingFiles)).to.have.length(4);
		});
	});

	describe('Should filter files by name', function() {
		var files;
		var options = {
			workingDirectory: testWorkingDir,
			"directoriesToExclude": [
			],
			"referencingFileFilter": [
				"*1.*"
			],
			"referencedFileFilter": [
				"*.*",
				"!foo_file*.*"
			]
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		afterEach(function() {
			config.reset();
		});
		it('Should get correct number of referencing/referenced files', function() {
			expect(Object.keys(files.referencingFiles)).to.have.length(3);
			expect(Object.keys(files.referencedFiles)).to.have.length(2);
			expect(Object.keys(files.referencedFiles)).to.not.contain(path.join(process.cwd(), 'test/files/filtering/foo_file1.jsx'));
		});
	});

	describe('Should filter files by excluding sources', function() {
		var files;
		var options = {
			workingDirectory: testWorkingDir,
			"directoriesToExclude": [
			],
			"referencingFileFilter": [
				"!foo*.*"
			],
			"referencedFileFilter": [
				"*.js",
				"*.jsx"
			]
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		afterEach(function() {
			config.reset();
		});
		it('Should get correct number of referencing/referenced files', function() {
			expect(Object.keys(files.referencingFiles)).to.have.length(2);
			expect(Object.keys(files.referencedFiles)).to.have.length(3);
		});
	});

});
