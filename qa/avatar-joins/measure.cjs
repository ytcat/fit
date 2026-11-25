// node qa/avatar-joins/measure.cjs — the numbers behind tests/avatar-joins.test.cjs for this tree (ROOT=<checkout> for another):
// shorts rim (steepest fabric facet within 12 mm of an opening), cuff envelope (forearm skin outside the glove cuff, mm),
// side piping under the shorts, street hoodie armhole creases and folds, Bruno's sweater armpit creases, sneaker sole slit.
const lib = require('./lib.cjs'); lib.load();
const J = require('./joins-lib.cjs'), cast = require('./cast.cjs');
const out = {};
for (const name of ['lion-kit', 'rabbit-kit', 'brick']) { const c = cast.make(name); out[name] = { rim: J.shortsRim(c), cuff: J.cuffEnvelope(c, cast.POSES.box), piping: J.pipingUnderShorts(c, { ...cast.POSES.box, ...cast.POSES.civil }) }; }
for (const name of ['lion-street', 'rabbit-street']) { const c = cast.make(name); out[name] = { armhole: J.armhole(c, cast.posesFor(name)), sole: J.soleSlit(c) }; }
{ const c = cast.make('bruno'); out.bruno = { armpit: J.streamArmpit(c, cast.POSES.civil) }; }
console.log(JSON.stringify(out, null, 1));
