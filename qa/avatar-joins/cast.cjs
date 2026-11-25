// qa/avatar-joins/cast.cjs — Node side of poses.js: builds a variant with the audit's surface data.
const lib = require('./lib.cjs'); lib.load();
const P = require('./poses.js');
let ENG = null;
function make(name) { const d = lib.data(); ENG = ENG || { roster: { data: d }, arena: { models: {} } }; return P.make(name, d, ENG); }
module.exports = { VARIANTS: P.VARIANTS, POSES: P.POSES, posesFor: P.posesFor, make };
