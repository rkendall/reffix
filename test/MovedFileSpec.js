var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var expect = require('chai').expect;
var mv = require('mv');

var config = require('../lib/config');
var parser = require('../lib/parser');
var depDoc = require('../dependencyDoctor');

describe('Moved Files', function() {
	var testBaseDir = 'test/fixtures/modules/';
	var options = {
		workingDir: testBaseDir + 'moved'
	};
	var baseDir = path.join(process.cwd(), options.workingDir) + '/';
	var rootDir = path.join(baseDir, 'root') + '/';
	before(function(done) {
		Q.nfcall(fse.emptyDir, testBaseDir + 'moved')
			.then(function() {
				return Q.nfcall(fse.copy,
					testBaseDir + 'original',
					baseDir
				);
			})
			.then(function() {
				return Q.nfcall(fse.mkdirs,
					rootDir + 'level1c/level2c/level3c'
				)
			})
			.then(function() {
				console.log('Test files copied');
				return Q.all([
					// Move file1.js
					Q.nfcall(fse.move,
						rootDir + 'file1.js',
						rootDir + 'level2c/level3c/file1.js'
					)
				]);
			})
			.then(function() {
				console.log('File structure prepared for tests');
				done();
			})
			.catch(function(err) {
				console.error(err);
				done(err);
			});
	});
	after(function(done) {
		fse.remove(baseDir, function(err) {
			if (!err) {
				console.log('Test files removed');
				done();
			} else {
				done(err);
			}
		})
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
			expect(brokenReferences).to.have.length(12);
		});
		it('Should correctly identify broken references', function() {
			expect(brokenReferences[0].referencedFile).to.equal(rootDir + 'level2c/level3c/level1a/file1.jsx');
			expect(brokenReferences[0].referencingFiles[0]).to.equal(rootDir + 'level2c/level3c/file1.js')
		});
	});


});