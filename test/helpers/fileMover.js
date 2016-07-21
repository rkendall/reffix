var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var mv = require('mv');

var fileMover = {

	testBaseDir: 'test/fixtures/modules/',

	moveFiles: function(dir, done) {
		var self = this;
		var workingDir = this.getFullTestPath(dir);
		var rootDir = path.join(workingDir, 'root') + '/';
		return Q.nfcall(fse.emptyDir, workingDir)
			.then(function() {
				return Q.nfcall(fse.copy,
					self.testBaseDir + 'original',
					workingDir
				);
			})
			.then(function() {
				console.log('Test files copied');
				return Q.all([
					// Move files
					Q.nfcall(fse.move,
						rootDir + 'file-with-references.js',
						rootDir + 'level1c/level2c/file-with-references.js'
					),
					Q.nfcall(fse.move,
						rootDir + 'level1b/file4.js',
						rootDir + 'level1a/file4.js'
					),
					Q.nfcall(fse.move,
						rootDir + 'level1b/level2b/file7.js',
						rootDir + 'file7.js'
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

	deleteMovedFiles: function(dir, done) {
		var workingDir = this.getFullTestPath(dir);
		fse.remove(workingDir, function(err) {
			if (!err) {
				console.log('Test files removed');
				done();
			} else {
				console.error(err);
				done(err);
			}
		})

	},

	getFullTestPath: function(dir) {
		return path.resolve(this.testBaseDir, dir) + '/';
	}

};

module.exports = {
	moveFiles: fileMover.moveFiles.bind(fileMover),
	deleteMovedFiles: fileMover.deleteMovedFiles.bind(fileMover)
};
