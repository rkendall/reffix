var path = require('path');
var expect = require('chai').expect;
var mv = require('mv');

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Moved Files', function() {
	var testBaseDir = 'test/fixtures/modules/';
	var topLevelDir = 'moved';
	var options = {
		workingDir: testBaseDir + topLevelDir
	};
	var baseDir = path.join(process.cwd(), options.workingDir) + '/';
	var rootDir = path.join(baseDir, 'root') + '/';
	before(function(done) {
		fileMover.moveFiles(topLevelDir, done);
	});
	after(function(done) {
		fileMover.deleteMovedFiles(topLevelDir, done);
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
			workingDir: testBaseDir + topLevelDir
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
		it('Should correctly identify broken references, referencers, and correct paths', function() {
			var result1 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile === rootDir + 'level1c/level2c/level1a/file-with-references.jsx') {
					return true;
				}
			});
			expect(result1).to.be.ok;
			expect(result1.referencingFiles).to.contain(rootDir + 'level1c/level2c/file-with-references.js');
			expect(result1.correctPath).to.equal(rootDir + 'level1a/file-with-references.jsx');

			var result2 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(rootDir + 'level1c/level2c/level1b/file4.js') !== -1) {
					return true;
				}
			});
			expect(result2).to.be.ok;
			expect(result2.referencingFiles).to.contain(rootDir + 'level1c/level2c/file-with-references.js');
			expect(result2.correctPath).to.equal(rootDir + 'level1a/file4.js');

			var result3 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(rootDir + 'level1c/level2c/level1b/level2b/file7.js') !== -1) {
					return true;
				}
			});
			expect(result3).to.be.ok;
			expect(result3.referencingFiles).to.contain(rootDir + 'level1c/level2c/file-with-references.js');
			expect(result3.correctPath).to.equal(rootDir + 'file7.js');
		});

	});

});