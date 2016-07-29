'use strict';

var Q = require('q');

// Extend Q to handle errors in a consistent way
Q.makePromise.prototype.handleError = function() {
	return this.catch(function(err) {
		console.error(err.stack);
		return err;
	});
};
