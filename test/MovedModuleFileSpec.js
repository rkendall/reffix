var path = require('path');
var expect = require('chai').expect;

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var parser = require('../lib/parser');

var filesToMove = require('./fixtures/moduleFilesToMove.json');

describe('Moved Files', function() {

	var testBaseDir = 'test/files/modules/moved';
	var testDir = 'modules';
	var fullBasePath = path.resolve(testBaseDir) + '/';

	before(function(done) {
		fileMover.moveFiles(testDir, filesToMove, done);
	});
	after(function(done) {
		fileMover.deleteMovedFiles(testDir, done);
	});

	describe('Broken References', function() {
		var brokenReferences;
		var options = {
			workingDirectory: testBaseDir
		};
		beforeEach(function(done) {
			config.reset();
			config.forceSet(options);
			parser.getBrokenReferences(options)
				.then(function(result) {
					brokenReferences = result.brokenReferences;
					done();
				})
		});
		afterEach(function() {
			config.reset();
		});
		it('Should find correct number of broken references', function() {
			expect(brokenReferences).to.have.length(13);
		});
		it('Should correctly identify broken references, referencers, and correct paths', function() {
			var result1 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile === fullBasePath + 'level1c/level2c/level1a/file-with-references.jsx') {
					return true;
				}
			});
			expect(result1).to.be.ok;
			expect(result1.referencingFiles).to.contain(fullBasePath + 'level1c/level2c/file-with-references.js');
			expect(result1.correctPath).to.equal(fullBasePath + 'level1a/file-with-references.jsx');

			var result2 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(fullBasePath + 'level1c/level2c/level1b/file4.js') !== -1) {
					return true;
				}
			});
			expect(result2).to.be.ok;
			expect(result2.referencingFiles).to.contain(fullBasePath + 'level1c/level2c/file-with-references.js');
			expect(result2.correctPath).to.equal(fullBasePath + 'level1a/file4.js');

			var result3 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(fullBasePath + 'level1c/level2c/level1b/level2b/file7.js') !== -1) {
					return true;
				}
			});
			expect(result3).to.be.ok;
			expect(result3.referencingFiles).to.contain(fullBasePath + 'level1c/level2c/file-with-references.js');
			expect(result3.correctPath).to.equal(fullBasePath + 'file7.js');
		});

	});

});