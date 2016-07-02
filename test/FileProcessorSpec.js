var path = require('path');
var fse = require('fs-extra');
var expect = require('chai').expect;
var mv = require('mv');
var depDoc = require('../lib/fileProcessor');

describe('Original Files', function() {

	describe('References', function() {
		var files;
		var config = {
			workingDir: 'test/fixtures/original'
		};
		beforeEach(function(done) {
			depDoc.getReferences(config).then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(13);
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

	describe('Broken References', function() {
		var brokenReferences;
		var config = {
			workingDir: 'test/fixtures/original'
		};
		beforeEach(function(done) {
			depDoc.getBrokenReferences(config).then(function(result) {
				brokenReferences = result;
				done();
			})
		});
		it('Should find no broken references', function() {
			expect(Object.keys(brokenReferences)).to.have.length(0);
		});
	});

});

describe('Moved Files', function() {
	before(function() {

	});
});