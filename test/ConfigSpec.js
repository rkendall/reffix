var path = require('path');
var expect = require('chai').expect;

var config = require('../lib/config');

describe('Configuration', function() {

	describe('Should accept options', function() {

		beforeEach(function() {
			config.reset();
		});
		afterEach(function() {
			config.reset();
		});

		it('Should load correct value for working dir', function() {
			var workingDir = path.join(process.cwd(), 'test/files/modules');
			var options = {
				workingDir: workingDir
			};
			config.set(options);
			var settings = config.get();
			expect(settings.workingDir).to.equal(workingDir);
		});
		it('Should change modes correctly', function() {
			config.setMode('html');
			var settings = config.get();
			expect(settings.referencingFileFilter).to.have.length(1);
			expect(settings.referencingFileFilter).to.contain('*.html');
			expect(settings.workingDir).to.equal(process.cwd());
		});
		it('Should accept new file filter', function() {
			var options = {
				referencingFileFilter: ['index.js']
			};
			config.set(options);
			var settings = config.get();
			expect(settings.referencingFileFilter).to.have.length(1);
			expect(settings.referencingFileFilter).to.contain('index.js');
		});
		it('Should change modes and accept new file filter', function() {
			config.setMode('html');
			var options = {
				referencingFileFilter: ['index.html']
			};
			config.set(options);
			var settings = config.get();
			expect(settings.referencingFileFilter).to.have.length(1);
			expect(settings.referencingFileFilter).to.contain('index.html');
		});

	});
	
	describe('Should accept custom rc file', function() {

		beforeEach(function() {
			config.reset();
			var pathOfRcFile = path.join(process.cwd(), 'test/files/.reffixrc');
			config.set(null, pathOfRcFile);
		});
		afterEach(function() {
			config.reset();
		});
		
		it('Should add test mode', function() {
			config.setMode('test');
			var settings = config.get();
			expect(settings.referencingFileFilter).to.have.length(1);
			expect(settings.referencingFileFilter).to.contain('test.*');
			expect(settings.referencedFileFilter).to.have.length(1);
			expect(settings.referencedFileFilter).to.contain('test_test.*');
			expect(settings.workingDir).to.equal(process.cwd());
		});
		it('Should not change default settings', function() {
			config.setMode('default');
			var settings = config.get();
			expect(settings.referencingFileFilter).to.have.length(2);
			expect(settings.referencingFileFilter).to.contain('*.js');
			expect(settings.referencingFileFilter).to.contain('*.jsx');
			expect(settings.workingDir).to.equal(process.cwd());
		});

	})

});