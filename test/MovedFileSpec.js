var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var expect = require('chai').expect;
var mv = require('mv');
var parser = require('../lib/parser');
var depDoc = require('../dependencyDoctor');

describe('Moved Files', function() {
	var config = {
		workingDir: 'test/fixtures/moved'
	};
	var baseDir = path.join(process.cwd(), config.workingDir) + '/';
	var rootDir = path.join(baseDir, 'root') + '/';
	before(function(done) {
		Q.nfcall(fse.emptyDir, 'test/fixtures/moved')
			.then(function() {
				return Q.nfcall(fse.copy,
					'test/fixtures/original',
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
			parser.getReferences(config).then(function(result) {
				files = result;
				done();
			})
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(13);
		});
	});

	describe('Broken References', function() {
		var brokenReferences;
		var config = {
			workingDir: 'test/fixtures/moved'
		};
		beforeEach(function(done) {
			parser.getBrokenReferences(config)
				.then(function(result) {
					brokenReferences = result;
					done();
				})
		});
		it('Should find correct number of broken references', function() {
			expect(Object.keys(brokenReferences)).to.have.length(8);
		});
		it('Should correctly identify broken references', function() {
			expect(brokenReferences[0].referencedFile).to.equal(rootDir + 'level2c/level3c/level1a/file1.jsx');
			expect(brokenReferences[0].referencingFiles[0]).to.equal(rootDir + 'level2c/level3c/file1.js')
		});
	});


});