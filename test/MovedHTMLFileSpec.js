var path = require('path');
var expect = require('chai').expect;

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var parser = require('../lib/parser');

var filesToMove = require('./fixtures/htmlFilesToMove.json');

describe('Moved HMTL Files', function() {

	var testBaseDir = 'test/files/html/moved';
	var testDir = 'html';
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
			mode: 'html',
			workingDirectory: testBaseDir
		};
		beforeEach(function(done) {
			config.reset();
			config.set(options);
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
			expect(brokenReferences).to.have.length(5);
		});

		it('Should correctly identify broken references, referencers, and correct paths', function() {

			var result1 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile === fullBasePath + 'level1/css/file1.css') {
					return true;
				}
			});
			expect(result1).to.be.ok;
			expect(result1.referencingFiles).to.contain(fullBasePath + 'level1/index.html');
			expect(result1.correctPath).to.equal(fullBasePath + 'css/file1.css');

			var result2 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(fullBasePath + '' + 'level1/file1.html') !== -1) {
					return true;
				}
			});
			expect(result2).to.be.ok;
			expect(result2.referencingFiles).to.contain(fullBasePath + 'level1/index.html');
			expect(result2.correctPath).to.equal(fullBasePath + 'file1.html');

			var result3 = brokenReferences.find(function(brokenReference) {
				if (brokenReference.referencedFile.indexOf(fullBasePath + 'level1/file1.js') !== -1) {
					return true;
				}
			});
			expect(result3).to.be.ok;
			expect(result3.referencingFiles).to.contain(fullBasePath + 'level1/index.html');
			expect(result3.correctPath).to.equal(fullBasePath + 'file1.js');

		});

	});

});