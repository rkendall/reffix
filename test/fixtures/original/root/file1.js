'use strict';

import module1 from './level1a/file1.jsx';
import module2 from './file2.js';

import { member1, member2 } from './level1a/level2a/file6';

var module3 = require('./level1c/file3.jsx');
const module4 = require('./level1b/file4.js');
const module7 = require('./level1b/level2b/file2.jsx');

let module5 = require('./level1b/level2b/file7').someMethod;
var module6 = require('./level1c/file5')();

let foo = bar;