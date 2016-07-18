var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var mv = require('mv');

var fileMover = {

	testBaseDir: 'test/fixtures/modules/',
	workingDir: 'test/fixtures/modules/moved',

	moveFiles: function(done) {
		var self = this;
		var rootDir = path.join(this.getBaseDir(), 'root') + '/';
		return Q.nfcall(fse.emptyDir, this.workingDir)
			.then(function() {
				return Q.nfcall(fse.copy,
					self.testBaseDir + 'original',
					self.getBaseDir()
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
					// Move files
					Q.nfcall(fse.move,
						rootDir + 'file-with-references.js',
						rootDir + 'level2c/level3c/file-with-references.js'
					),
					Q.nfcall(fse.move,
						rootDir + 'level1b/file4.js',
						rootDir + 'level1a/file4.js'
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
	},

	deleteMovedFiles: function(done) {
		fse.remove(this.getBaseDir(), function(err) {
			if (!err) {
				console.log('Test files removed');
				done();
			} else {
				done(err);
			}
		})

	},

	getBaseDir: function() {
		return path.join(process.cwd(), this.workingDir) + '/';
	}

};

module.exports = {
	moveFiles: fileMover.moveFiles.bind(fileMover),
	deleteMovedFiles: fileMover.deleteMovedFiles.bind(fileMover)
};
