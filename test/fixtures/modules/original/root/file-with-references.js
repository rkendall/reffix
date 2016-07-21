'use strict';

import module1 from './level1a/file-with-references.jsx';
import $ from './file2.js';

/*
 * import module1 from './file12.js';
 *
 */

import { member1, member2 } from './level1a/level2a/file6';
import * as name from "./rootfile1";
import defaultMember, { member1, member2 }
	from "./rootfile2";
import defaultMember, * as name from "./rootfile3";
import './rootfile4.js'
// import module2a from './file12.js';


var module3 = require('./level1a/file3.jsx');
const module4 = require('./level1b/file4.js');
const module5 = require ("./level1b/level2b/file2.jsx");

let module6 = require( './level1b/level2b/file7' ).someMethod;
var module7 = require("./level1a/file5.js")();

// var module8 = require('./file10.js');

/*
* import module9 from './file11.js';
*
*/

let foo = bar;