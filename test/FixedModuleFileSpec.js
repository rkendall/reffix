var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var mv = require('mv');

var fileMover = require('./helpers/fileMover');
var config = require('../lib/config');
var updater = require('../lib/updater');

var filesToMove = require('./fixtures/moduleFilesToMove.json');

describe('File Repair for Modules', function() {
	var testBaseDir = 'test/files/modules/moved';
	var testDir = 'modules';
	var options = {
		workingDirectory: testBaseDir
	};
	var baseDir = path.resolve(testBaseDir) + '/';
	before(function(done) {
		fileMover.moveFiles(testDir, filesToMove, done);
	});
	after(function(done) {
		fileMover.deleteMovedFiles(testDir, done);
	});
	describe('References', function() {
		var files;
		var pathOfFileWithReferences = path.join(baseDir, 'level1c/level2c/file-with-references.js');
		beforeEach(function(done) {
			config.forceSet(options);
			updater.fixReferences().then(function(result) {
				files = result;
				done();
			})
		});
		it('Should fix correct files', function() {
			expect(files).to.have.length(2);
			expect(files[0]).to.equal(path.join(baseDir, 'level1a/file-with-references.jsx'));
			expect(files[1]).to.equal(pathOfFileWithReferences);
		});
		it('Should correctly update file content', function(done) {
			fs.readFile(pathOfFileWithReferences, 'utf8', function(err, content) {
				expect(content).to.contain("import module1 from '../../level1a/file-with-references.jsx';");
				expect(content).to.contain("const module4 = require('../../level1a/file4.js');");
				expect(content).to.contain("let module6 = require( '../../file7.js' ).someMethod;");
				done();
			});
		})
	});

});