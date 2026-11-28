// Run: node --test tests/free-walk-intersection-yield.test.cjs
// Detached: GOTR_ROOT=/path/to/checkout node --test free-walk-intersection-yield.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(process.env.GOTR_ROOT || path.join(__dirname, '..'));
const C = require(path.join(root, 'adventure/free-walk/free-walk-core.js'));
const T = require(path.join(root, 'assets/vendor/three.min.js'));
const town = readFileSync(process.env.GOTR_TOWN || path.join(root, 'adventure/free-walk/free-walk-town.js'), 'utf8');
// Exercise the actual town traffic closure verbatim, including the instance
// pose and normal blocked() check. Only supply a deterministic scene/grid/roads.
const match = town.match(/\/\* ---- traffic \*\/(?<traffic>[\s\S]+?)\/\* ---- people on the pavements/);
assert.ok(match, 'could not find native town traffic closure');
const segments = [
  { a: [0, 0], b: [20, 0], w: 8 },
  { a: [20, 0], b: [20, -20], w: 8 },
];
const occupied = { x: 22, z: -.55 }, incoming = { x: 22, z: 0 }, clear = { x: 24.6, z: -.55 };
const dt = 1 / 30;

function fixture() {
  const roads = C.roadGraph(segments, 2.2), scene = new T.Scene(), S = 3;
  const geometry = new T.BoxGeometry(1, 1, 1), material = new T.MeshBasicMaterial();
  const map = { meshes: { cars: { geometry, material } } };
  const GlorylandMap = { PAL: { car: ['#ffffff'] } };
  const grid = { allowed: () => true, height: () => 0 }, landY = 0;
  const traffic = vm.runInNewContext(match.groups.traffic +
    '\n;({ cars, updateCars, blocked, carMesh })', {
    C, T, trafficRoads: roads, art: null, scene, map, GlorylandMap, grid, landY, MAX_CARS: 1, S, rng: () => () => .5,
  }, { filename: 'free-walk-town.js (native traffic closure)' });
  const vehicle = { e: 0, dir: 1, s: 19.9, speed: 7.5, cruise: 7.5, color: new T.Color() };
  traffic.cars.push(vehicle);
  function tick(point) {
    traffic.updateCars(dt, point);
    assert.equal(traffic.cars.length, 1, 'same vehicle remains in simulation');
    assert.equal(traffic.cars[0], vehicle, 'same vehicle remains in simulation');
    assert.equal(traffic.carMesh.count, 1, 'same vehicle remains visible');
    const matrix = new T.Matrix4();
    traffic.carMesh.getMatrixAt(0, matrix);
    const rendered = new T.Vector3().setFromMatrixPosition(matrix);
    assert.ok(Math.hypot(rendered.x - vehicle.x, rendered.z - vehicle.z) < 1e-5);
    return { edge: vehicle.e, s: +vehicle.s.toFixed(4), speed: +vehicle.speed.toFixed(4),
      x: +rendered.x.toFixed(4), z: +rendered.z.toFixed(4), waiting: !!vehicle.waiting,
      overlap: traffic.blocked(point.x, point.z) };
  }
  return { tick };
}

test('intersection control: a pedestrian in the incoming lane stops traffic', t => {
  const { tick } = fixture(), state = tick(incoming);
  t.diagnostic(JSON.stringify(state));
  assert.equal(state.edge, 0);
  assert.ok(state.s < 20 && state.waiting);
});

test('intersection control: a clear outgoing lane allows the turn', t => {
  const { tick } = fixture(), state = tick(clear);
  t.diagnostic(JSON.stringify(state));
  assert.equal(state.edge, 1);
  assert.ok(state.s > 0);
  assert.equal(state.overlap, false);
});

test('occupied outgoing lane: the car yields through the turn, then resumes when clear', t => {
  const { tick } = fixture();
  let parked;
  for (let i = 0; i < 60; i++) {
    parked = tick(occupied);
    if (i === 0) t.diagnostic('first tick: ' + JSON.stringify(parked));
    assert.equal(parked.overlap, false,
      `car overlaps pedestrian while outgoing lane is occupied, tick ${i + 1}: ${JSON.stringify(parked)}`);
  }
  assert.ok(parked.speed < .3, 'car settles to a yield with pedestrian still present');
  let resumed;
  for (let i = 0; i < 120; i++) {
    resumed = tick(clear);
    assert.equal(resumed.overlap, false, 'vehicle stays clear of pedestrian after resuming');
    if (resumed.edge === 1 && resumed.s > .5 && resumed.speed > .3) break;
  }
  t.diagnostic('after clearing: ' + JSON.stringify(resumed));
  assert.ok(resumed.edge === 1 && resumed.s > .5 && resumed.speed > .3,
    'car enters the now-clear outgoing lane under its own power');
});
