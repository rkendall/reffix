var path = require('path');
var expect = require('chai').expect;
var depDoc = require('../lib/fileProcessor');

describe('References', function() {
	var references;
	var config = {
		workingDir: 'test/fixtures/original'
	};
	beforeEach(function(done) {
		depDoc.getReferences(config).then(function(result) {
			references = result;
			done();
		})
	});
	it('Should get correct number of files', function() {
		expect(Object.keys(references.existingFiles)).to.have.length(13);
	});
	it('Should get correct file paths', function() {
		expect(references.existingFiles).to.have.property(path.join(process.cwd(), config.workingDir, 'root/level1a/file1.jsx'));
	});
});