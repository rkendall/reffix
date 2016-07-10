var path = require('path');
var expect = require('chai').expect;

var config = require('../lib/config');
var parser = require('../lib/parser');

describe('Filtering', function() {

	var testWorkingDir = 'test/fixtures/filtering';

	describe('Should filter directories and files', function() {
		var files;
		var options = {
			workingDir: testWorkingDir
		};
		beforeEach(function(done) {
			config.forceSet(options);
			parser.getReferences().then(function(result) {
				files = result;
				done();
			});
		});
		it('Should get correct number of files', function() {
			expect(Object.keys(files.existingFiles)).to.have.length(1);
		});

	});

});
