var path = require('path');
var expect = require('chai').expect;

var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Original HTML Files', function() {

	var testWorkingDir = 'test/fixtures/html/original';

	describe('References', function() {
		var files;
		var options = {
			mode: 'html',
			workingDir: testWorkingDir
		};
		beforeEach(function(done) {
			config.reset();
			config.set(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		afterEach(function() {
			config.reset();
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(6);
		});
		it('Should get correct number of referencing files', function() {
			expect(Object.keys(files.referencingFiles)).to.have.length(1);
		});
		it('Should get correct file paths', function() {
			expect(files.referencingFiles).to.have.property(path.resolve(options.workingDir, 'index.html'));
		});
		it('Should get correct number of references within files', function() {
			expect(Object.keys(files.referencedFiles)).to.have.length(5);
		})
		it('Should get correct file paths', function() {
			expect(files.referencedFiles).to.have.property(path.resolve(options.workingDir, 'level1/file2.js'));
		});
	});

	describe('Filtered References for CSS only', function() {
		var files;
		var options = {
			mode: 'html',
			workingDir: testWorkingDir,
			referencedFileFilter: ['*.css']
		};
		beforeEach(function(done) {
			config.set(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of references within files', function() {
			expect(Object.keys(files.referencedFiles)).to.have.length(1);
		})
	});

	describe('Broken References', function() {
		var brokenReferences;
		var options = {
			workingDir: testWorkingDir
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getBrokenReferences().then(function(result) {
				brokenReferences = result.brokenReferences;
				done();
			})
		});
		it('Should find no broken references', function() {
			expect(Object.keys(brokenReferences)).to.have.length(0);
		});
	});

});