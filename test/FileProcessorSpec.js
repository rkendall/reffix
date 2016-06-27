var expect = require('chai').expect;
var depDoc = require('../lib/fileProcessor');

describe('References', function() {
	var references;
	beforeEach(function(done) {
		depDoc.getReferences().then(function(result) {
			references = result;
			done();
		})
	});
	it('Should get correct number of files', function() {
		expect(Object.keys(references.existingFiles)).to.have.length(9);
	});
	it('Should get correct file paths', function() {
		expect(references.existingFiles).to.have.property('/Users/robertkendall/code/react/test/src/module1.js');
	});
});