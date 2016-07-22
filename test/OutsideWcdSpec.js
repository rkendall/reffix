var path = require('path');
var expect = require('chai').expect;

var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Outside CWD', function() {

	var testWorkingDir = 'test/files/ref-outside-cwd';

	describe('References', function() {
		var files;
		var options = {
			workingDir: testWorkingDir
		};
		beforeEach(function(done) {
			config.reset();
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		it('Should find file outside of CWD', function() {
			expect(Object.keys(files.referencedFiles)).to.have.length(1);
			expect(files.referencedFiles).to.have.property(path.join(process.cwd(), 'test/files/outside-cwd/file1.js'));
		});

	});

});
