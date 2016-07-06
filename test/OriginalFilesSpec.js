var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var expect = require('chai').expect;
var mv = require('mv');
var parser = require('../lib/parser');
var depDoc = require('../dependencyDoctor');

describe('Original Files', function() {

	describe('References', function() {
		var files;
		var config = {
			workingDir: 'test/fixtures/original'
		};
		beforeEach(function(done) {
			parser.getReferences(config).then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(13);
		});
		it('Should get correct number of referencing files', function() {
			expect(Object.keys(files.referencingFiles)).to.have.length(1);
		});
		it('Should get correct file paths', function() {
			expect(files.existingFiles).to.have.property(path.join(process.cwd(), config.workingDir, 'root/file1.json'));
			expect(files.existingFiles).to.have.property(path.join(process.cwd(), config.workingDir, 'root/level1a/file1.jsx'));
			expect(files.existingFiles).to.have.property(path.join(process.cwd(), config.workingDir, 'root/level1a/level2a/level3a/file8.js'));
		});
		it('Should get correct number of references within files', function() {
			expect(Object.keys(files.referencedFiles)).to.have.length(8);
		})
	});

	describe('Filtered References', function() {
		var files;
		var config = {
			workingDir: 'test/fixtures/original',
			referencingFileFilter: ['*.js'],
			referencedFileFilter: ['*.js']
		};
		beforeEach(function(done) {
			parser.getReferences(config).then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of existing files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(8);
		});
		it('Should get correct number of references within files', function() {
			expect(Object.keys(files.referencedFiles)).to.have.length(5);
		})
	});

	describe('Broken References', function() {
		var brokenReferences;
		var config = {
			workingDir: 'test/fixtures/original'
		};
		beforeEach(function(done) {
			parser.getBrokenReferences(config).then(function(result) {
				brokenReferences = result;
				done();
			})
		});
		it('Should find no broken references', function() {
			expect(Object.keys(brokenReferences)).to.have.length(0);
		});
	});

});