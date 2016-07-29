var path = require('path');
var fse = require('fs-extra');
var Q = require('q');
var qe = require('../../lib/qExtensions');
var mv = require('mv');

var fileMover = {

	moveFiles: function(dir, files, done) {
		var workingDir = this.getFullTestPath(dir);
		var movedDir = workingDir + 'moved/';
		return Q.nfcall(fse.emptyDir, movedDir)
			.then(function() {
				return Q.nfcall(fse.copy,
					workingDir + 'original/',
					movedDir
				);
			})
			.then(function() {
				console.log('Test files copied');
				var fileMovePromises = files.map(function(filenames) {
					return Q.nfcall(fse.move,
						movedDir + filenames[0],
						movedDir + filenames[1]
					)
					.handleError();
				});
				return Q.all(fileMovePromises);
			})
			.then(function() {
				console.log('File structure prepared for tests');
				done();
			})
			.handleError();
	},

	deleteMovedFiles: function(dir, done) {
		var movedDir = this.getFullTestPath(dir) + 'moved';
		fse.remove(movedDir, function(err) {
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
		return path.resolve('test/files/', dir) + '/';
	}

};

module.exports = {
	moveFiles: fileMover.moveFiles.bind(fileMover),
	deleteMovedFiles: fileMover.deleteMovedFiles.bind(fileMover)
};
