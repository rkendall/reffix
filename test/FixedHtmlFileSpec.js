var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var mv = require('mv');

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var updater = require('../lib/updater');

var filesToMove = require('./fixtures/htmlFilesToMove.json');

describe('File Repair for Html', function() {
	var testBaseDir = 'test/files/html/moved';
	var testDir = 'html';
	var baseDir = path.resolve(testBaseDir) + '/';
	before(function(done) {
		config.reset();
		fileMover.moveFiles(testDir, filesToMove, done);
	});
	after(function(done) {
		fileMover.deleteMovedFiles(testDir, done);
		config.reset();
	});
	describe('References', function() {
		var files;
		var pathOfFileWithReferences = path.join(baseDir, 'level1/index.html');
		beforeEach(function(done) {
			var options = {
				mode: 'html',
				workingDirectory: testBaseDir
			};
			config.set(options);
			updater.fixReferences().then(function(result) {
				files = result;
				done();
			})
		});
		it('Should fix correct files', function() {
			expect(files).to.have.length(1);
			expect(files[0]).to.equal(pathOfFileWithReferences);
		});
		it.only('Should correctly update file content', function(done) {
			fs.readFile(pathOfFileWithReferences, 'utf8', function(err, content) {
				expect(content).to.contain('<script src="file2.js"></script>');
				expect(content).to.contain('<link href="../css/file1.css" rel="stylesheet" title="Default Style">');
				expect(content).to.contain('<a href="../file1.html">link</a>');
				expect(content).to.contain('<img src="../images/file1.png" alt="image">');
				done();
			});
		})
	});

});