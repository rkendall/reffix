var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var expect = require('chai').expect;
var mv = require('mv');

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Moved Files', function() {
	var testBaseDir = 'test/fixtures/modules/';
	var options = {
		workingDir: testBaseDir + 'moved'
	};
	var baseDir = path.join(process.cwd(), options.workingDir) + '/';
	var rootDir = path.join(baseDir, 'root') + '/';
	before(function(done) {
		fileMover.moveFiles(done);
	});
	after(function(done) {
		fileMover.deleteMovedFiles(done);
	});
	describe('References', function() {
		var files;
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(17);
		});
	});

	describe('Broken References', function() {
		var brokenReferences;
		var options = {
			workingDir: testBaseDir + 'moved'
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getBrokenReferences(options)
				.then(function(result) {
					brokenReferences = result.brokenReferences;
					done();
				})
		});
		it('Should find correct number of broken references', function() {
			expect(brokenReferences).to.have.length(13);
		});
		it('Should correctly identify broken references', function() {
			expect(brokenReferences[1].referencedFile).to.equal(rootDir + 'level2c/level3c/level1a/file-with-references.jsx');
			expect(brokenReferences[1].referencingFiles[0]).to.equal(rootDir + 'level2c/level3c/file-with-references.js')
		});
	});

});