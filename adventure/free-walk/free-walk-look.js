/* Free walk look (owner 2026-11-25, iPhone: "the graphics are terrible ... Everything is blurry, and the walls look terrible
 * ... Make everything more realistic"). The picture of the walk town, the same way the story films draw their streets:
 *
 *   - sharpness: the walk draws at the screen's own resolution (device pixel ratio up to 2) instead of the engine's adaptive
 *     ratio (1-1.5, a third to a half of an iPhone's 3x screen), and gives detail back step by step only when frames are slow
 *     (a ladder like the engine's: pixel ratio, then the shadow pass, then the image-based light);
 *   - light of the story's time of day: the films' own morning / evening sun, sky and haze (story-sets.js), the films'
 *     image-based light (render-look.js), a real sun shadow fitted round the player (the town's merged meshes are cut into
 *     tiles so the shadow pass and the view only draw what is near);
 *   - walls: the map's painted facades at twice the texture resolution (the films' scale) and windows with depth: the
 *     glass sits behind the wall with lit reveals, sill and soffit (a per-pixel parallax box, no extra geometry), glass that
 *     reflects the sky;
 *   - clip(): takes buildings and props of the map out of a footprint where a detailed set stands instead (free-walk-sets.js).
 *
 *   FreeWalkLook.attach({ renderer, scene, map, time, tier }) -> look
 *     look.update(dt, player {x, z}, camera)   per frame: shadow box, adaptive quality
 *     look.level / look.lock(level | null) / look.stats() / look.dispose()   (everything back as found)
 *   FreeWalkLook.facades(map, { renderer, lit, sharp })      repaint the map's facades (sharper, lit windows) with window depth
 *   FreeWalkLook.relief(material, style, S)                  window depth on any kit facade material
 *   FreeWalkLook.tile(group, size)                           cut merged meshes into tiles of `size` metres (view and shadow culling)
 *   FreeWalkLook.clip(group, rects, yMin, keep, only)        remove map triangles / instances inside oriented rectangles (metres)
 *   FreeWalkLook.LIGHTS, FreeWalkLook.LEVELS
 * World: metres, x east, z south, y up. The map group is scaled by S (3 m per map unit). */
(() => {
  'use strict';
  // the films' light per time of day (story-sets.js build(): hemisphere, sun, sky gradient, haze); dir is the sun's direction
  const LIGHTS = {
    morning: { hemi: [0xc4dcff, 0xdcb98c, .54], sun: [0xffd7a3, 2.05], dir: [.58, .44, .68], amb: .05, sky: [[0, '#6fa8de'], [.38, '#a9cdea'], [.6, '#e6dccb'], [.74, '#ffd9a6'], [1, '#f6c58e']], fog: [0xf3dfc4, 36, 240], look: 'day' },
    day: { hemi: [0xd9eeff, 0xcdb88c, .58], sun: [0xfff0d6, 2.0], dir: [-.42, .72, .5], amb: .05, sky: [[0, '#5f9fdc'], [.4, '#a7cdee'], [.62, '#dfe6e8'], [1, '#e9dfcc']], fog: [0xdfe8ea, 40, 260], look: 'day' },
    evening: { hemi: [0x8f9cff, 0x7a4f3c, .46], sun: [0xff9450, 1.85], dir: [-.72, .3, .62], amb: .05, sky: [[0, '#27306e'], [.3, '#5a4a92'], [.5, '#b2648f'], [.66, '#f28a52'], [.8, '#ffc27a'], [1, '#f0a763']], fog: [0xd08a64, 30, 210], look: 'evening', lit: true },
    night: { keep: true, fog: [null, 60, 260], look: 'street_night', lit: true }
  };
  // quality ladder (highest last): [pixel-ratio cap, shadow map size (0 = no shadow pass), image-based light]
  const LEVELS = [[1.25, 0, false], [1.5, 0, true], [1.75, 1024, true], [2, 2048, true]];
  const SHADOW_R = 38; // metres round the player covered by the sun's shadow
  const WIN = { // the glass of each facade style in its 128 px cell (x0, y0 from the top-left, x1, y1) and its depth behind the wall (m)
    plaster: [44, 26, 84, 88, .3], brick: [42, 30, 86, 90, .3], apartment: [22, 30, 106, 86, .26], office: [5, 4, 123, 98, .14],
    deco: [30, 38, 104, 84, .3], shop: [10, 42, 118, 124, .5], industrial: [10, 17, 118, 35, .12]
  };

  function skyTexture(stops) {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    for (const [k, c] of stops) gr.addColorStop(k, c);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
  }

  /** Window depth: inside the glass rectangle of a cell the view ray is followed into a box behind the wall; it shows the
   * glass (the texture where the ray meets the back) or the reveal it meets first (sides, soffit, sill), shaded. Walls only,
   * fading out with distance (no shimmer far away). Chained after the kit's own facade shader. */
  function relief(mat, style, S = 3) {
    const w = WIN[style], st = window.GlorylandMap?.kit?.FACADE?.[style]; if (!w || !st || mat.userData.fwRelief) return mat;
    mat.userData.fwRelief = style;
    const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    const win = new THREE.Vector4(w[0], w[1], w[2], w[3]), cell = new THREE.Vector2(st.bay * S, st.floor * S);
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(mat, sh, r);
      sh.uniforms.fwWin = { value: win }; sh.uniforms.fwCell = { value: cell }; sh.uniforms.fwDepth = { value: w[4] };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFwW;\nvarying vec3 vFwN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFwW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz; vFwN = normalize( mat3( modelMatrix ) * objectNormal );');
      const kitLine = 'vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );\nfloat tintM = smoothstep( 0.62, 0.9, texelColor.a );\ndiffuseColor.rgb *= mix( texelColor.rgb * mix( vec3( 1.0 ), vTint, glassK ), texelColor.rgb * vTint, tintM );';
      if (!sh.fragmentShader.includes(kitLine)) return; // not a kit facade: leave it as it is
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFwW;\nvarying vec3 vFwN;\nuniform vec4 fwWin;\nuniform vec2 fwCell;\nuniform float fwDepth;')
        .replace(kitLine, [
          'vec2 fwUv = vUv; float fwGlass = 0.0, fwReveal = 0.0; float fwShade = 1.0;',
          '{ vec3 fN = normalize( vFwN );',
          '  if ( abs( fN.y ) < 0.3 ) {',
          '    vec3 fT = normalize( cross( vec3( 0.0, 1.0, 0.0 ), fN ) ), fV = normalize( cameraPosition - vFwW );',
          '    float fk = smoothstep( 95.0, 38.0, length( cameraPosition - vFwW ) );',
          '    vec2 fc = fract( vUv * 4.0 ) * 128.0; vec2 fp = vec2( fc.x, 128.0 - fc.y );',
          '    if ( fk > 0.0 && fp.x > fwWin.x && fp.x < fwWin.z && fp.y > fwWin.y && fp.y < fwWin.w ) {',
          '      float fvn = max( dot( fV, fN ), 0.12 );',
          '      vec2 fd = vec2( -dot( fV, fT ) / fvn * fwDepth / fwCell.x, fV.y / fvn * fwDepth / fwCell.y ) * 128.0 * fk;',
          '      float tx = fd.x > 0.001 ? ( fwWin.z - fp.x ) / fd.x : fd.x < -0.001 ? ( fwWin.x - fp.x ) / fd.x : 1e3;',
          '      float ty = fd.y > 0.001 ? ( fwWin.w - fp.y ) / fd.y : fd.y < -0.001 ? ( fwWin.y - fp.y ) / fd.y : 1e3;',
          '      float ft = min( tx, ty );',
          '      if ( ft >= 1.0 ) { fwUv = vUv + vec2( fd.x, -fd.y ) / 512.0; fwGlass = 1.0; fwShade = 0.82; }',
          '      else { fwReveal = 1.0; fwShade = ( tx < ty ? 0.62 + 0.1 * sign( fd.x ) : ( fd.y < 0.0 ? 0.4 : 0.86 ) ) * ( 0.8 + 0.2 * ft ); }',
          '    }',
          '  }',
          '}',
          'vec4 texelColor = mapTexelToLinear( texture2D( map, fwUv ) );',
          'float tintM = smoothstep( 0.62, 0.9, texelColor.a );',
          'vec3 fwCol = mix( texelColor.rgb * mix( vec3( 1.0 ), vTint, glassK ), texelColor.rgb * vTint, tintM );',
          'if ( fwReveal > 0.5 ) fwCol = vTint * 0.86;',
          'diffuseColor.rgb *= fwCol * fwShade;'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.14, fwGlass );')
        .replace('vec4 emissiveColor = texture2D( emissiveMap, vUv );', 'vec4 emissiveColor = texture2D( emissiveMap, fwUv ) * ( 1.0 - fwReveal );');
    };
    mat.customProgramCacheKey = () => 'fw-relief|' + style + '|' + key;
    mat.needsUpdate = true;
    return mat;
  }

  /** The map's facades painted again: `sharp` x the map's texture scale (the films paint theirs at 2), lit windows when `lit`
   * (evening and night), and window depth. Returns the new textures (disposed with the look). */
  function facades(map, { renderer, lit = false, sharp = 2 } = {}) {
    const K = window.GlorylandMap?.kit; if (!K) return [];
    const meshes = Object.entries(map.meshes).filter(([n, m]) => n.startsWith('facade ') && m.isMesh);
    const used = new Set(meshes.map(([n]) => n.slice(7)));
    const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    const tex = K.paintFacades(lit, aniso, s => used.has(s) ? (s === 'shop' ? sharp + 1 : sharp) : 0), out = [];
    for (const [name, m] of meshes) {
      const s = name.slice(7), t = tex[s]; if (!t) continue;
      const old = m.material, fm = K.facadeMaterial(t, lit, s === 'office' ? .45 : s === 'deco' ? .7 : .85, s === 'office' ? .75 : s === 'deco' ? .3 : .12);
      if (lit && !map.night) fm.emissiveIntensity = 1.5; // dusk: the films' lit windows (story-sets.js)
      if (sharp >= 2 && renderer?.capabilities?.isWebGL2 !== false) relief(fm, s, map.layout?.scale || 3); // the light path keeps flat facades
      m.material = fm; old.map?.dispose?.(); old.emissiveMap?.dispose?.(); old.dispose();
      out.push(t.map, fm); if (t.emissive) out.push(t.emissive);
    }
    return out;
  }

  /** Cuts each merged (non-indexed) mesh of `group` into square tiles of `size` metres, so the view and the shadow pass only
   * draw the tiles they see (the map is ~30 meshes over the whole town). Same names, materials and shadow flags. */
  function tile(group, size = 96, skip = /^(ground|sea|clouds|overhead)$/) {
    const S = group.scale.x || 1, cell = size / S, made = [];
    for (const m of [...group.children]) {
      if (!m.isMesh || m.isInstancedMesh || skip.test(m.name)) continue;
      const g = m.geometry; if (g.index || !g.attributes.position) continue;
      const P = g.attributes.position.array, n = P.length / 9; if (n < 2000) continue;
      const buckets = new Map(), names = Object.keys(g.attributes);
      for (let t = 0; t < n; t++) {
        const x = (P[t * 9] + P[t * 9 + 3] + P[t * 9 + 6]) / 3, z = (P[t * 9 + 2] + P[t * 9 + 5] + P[t * 9 + 8]) / 3;
        const k = Math.floor(x / cell) + ':' + Math.floor(z / cell); let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(t);
      }
      if (buckets.size < 2) continue;
      for (const list of buckets.values()) {
        const ng = new THREE.BufferGeometry();
        for (const a of names) {
          const src = g.attributes[a], sz = src.itemSize, arr = new Float32Array(list.length * 3 * sz);
          list.forEach((t, i) => arr.set(src.array.subarray(t * 3 * sz, (t + 1) * 3 * sz), i * 3 * sz));
          ng.setAttribute(a, new THREE.BufferAttribute(arr, sz));
        }
        ng.computeBoundingSphere();
        const tm = new THREE.Mesh(ng, m.material); tm.name = m.name; tm.castShadow = m.castShadow; tm.receiveShadow = m.receiveShadow; tm.renderOrder = m.renderOrder;
        tm.matrixAutoUpdate = false; tm.matrix.copy(m.matrix); tm.userData.tileOf = m.name; group.add(tm); made.push(tm);
      }
      group.remove(m); g.dispose();
    }
    return made;
  }

  /** Inside test for an oriented rectangle { x, z, ry, hw, hd } (metres): local frame x along ry, z across. */
  const inside = (r, x, z) => { const c = Math.cos(r.ry || 0), s = Math.sin(r.ry || 0), dx = x - r.x, dz = z - r.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) <= r.hw && Math.abs(lz) <= r.hd; };
  /** Removes what stands inside the rectangles: triangles of the merged meshes whose centre lies inside and above yMin
   * (metres: the pavement under a building stays), instances (trees, lamps, people...) and glow points. The ground,
   * the sea and the road paint are never cut. Returns the count of triangles and instances removed. */
  function clip(group, rects, yMin = -Infinity, keep = /^(ground|sea|road marks|clouds)$/, only = null) {
    if (!rects.length) return { tris: 0, inst: 0 };
    const S = group.scale.x || 1, M4 = new THREE.Matrix4(), V = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    const hit = (x, y, z) => y * S > yMin && rects.some(r => inside(r, x * S, z * S));
    let tris = 0, inst = 0;
    group.traverse(m => {
      if (keep.test(m.name) || (only && !only.test(m.name)) || !m.geometry?.attributes?.position) return;
      if (m.isInstancedMesh) {
        for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, M4); V.setFromMatrixPosition(M4); V.applyMatrix4(m.matrix); if (M4.elements[0] !== 0 && hit(V.x, V.y + .5, V.z)) { m.setMatrixAt(i, ZERO); inst++; } }
        m.instanceMatrix.needsUpdate = true; return;
      }
      const g = m.geometry, P = g.attributes.position;
      if (m.isPoints) { for (let i = 0; i < P.count; i++) if (hit(P.getX(i), P.getY(i), P.getZ(i))) { P.setY(i, -1e4); inst++; } P.needsUpdate = true; return; }
      if (!m.isMesh || g.index) return;
      const A = P.array, n = A.length / 9, keepT = [];
      for (let t = 0; t < n; t++) { const o = t * 9; if (!hit((A[o] + A[o + 3] + A[o + 6]) / 3, (A[o + 1] + A[o + 4] + A[o + 7]) / 3, (A[o + 2] + A[o + 5] + A[o + 8]) / 3)) keepT.push(t); }
      if (keepT.length === n) return;
      tris += n - keepT.length;
      for (const a of Object.keys(g.attributes)) {
        const src = g.attributes[a], sz = src.itemSize, arr = new Float32Array(keepT.length * 3 * sz);
        keepT.forEach((t, i) => arr.set(src.array.subarray(t * 3 * sz, (t + 1) * 3 * sz), i * 3 * sz));
        g.setAttribute(a, new THREE.BufferAttribute(arr, sz));
      }
      g.computeBoundingSphere();
    });
    return { tris, inst };
  }

  /** The look of the walk on the game's renderer. Everything it changes is given back by dispose(). */
  function attach({ renderer, scene, map, time = 'day', tier = 'high' } = {}) {
    const L = LIGHTS[time] || LIGHTS.day, S = map.layout?.scale || 3, sm = renderer.shadowMap;
    const was = { ratio: renderer.getPixelRatio(), shadow: sm.enabled, type: sm.type, auto: sm.autoUpdate, bg: scene.background, fog: scene.fog };
    const own = [], dpr = Math.max(1, window.devicePixelRatio || 1), low = tier === 'low';
    const top = low ? 1 : LEVELS.length - 1;
    // ---- light of the time of day
    const sun = map.sun, hemi = map.hemi, amb = map.group.children.find(o => o.isAmbientLight);
    let dir = new THREE.Vector3(...(L.dir || [.45, .8, -.4])).normalize();
    if (!L.keep) {
      hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
      sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; if (amb) amb.intensity = L.amb;
      const sky = skyTexture(L.sky); own.push(sky); scene.background = sky;
      scene.fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
    } else {
      dir = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize();
      if (scene.fog) { scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2]; }
    }
    // the sun's shadow: a box of SHADOW_R round the player (the light and its target live in the map group, in map units)
    const sc = sun.shadow.camera; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 2.5;
    let aimAt = null;
    function aim(x, z, force) {
      const texel = 2 * SHADOW_R / Math.max(512, sun.shadow.mapSize.x), q = texel * 8; // move in whole texel steps (no edge crawl)
      const ax = Math.round(x / q) * q, az = Math.round(z / q) * q;
      if (!force && aimAt && Math.hypot(ax - aimAt[0], az - aimAt[1]) < 3) return; aimAt = [ax, az];
      sun.target.position.set(ax / S, 0, az / S); sun.target.updateMatrixWorld();
      sun.position.set((ax + dir.x * 120) / S, dir.y * 120 / S, (az + dir.z * 120) / S); sun.updateMatrixWorld();
      sc.left = -SHADOW_R; sc.right = SHADOW_R; sc.top = SHADOW_R; sc.bottom = -SHADOW_R; sc.near = 5; sc.far = 260; sc.updateProjectionMatrix();
    }
    aim(0, 0, true);
    // image-based light of the films (render-look.js); switched with the ladder
    let rlook = null;
    try { rlook = window.RenderLook?.attach(scene, renderer, { look: L.look, high: !low, sun }) || null; } catch (x) { console.warn('walk look', x); rlook = null; }

    // three r128 keeps a program built with (or without) the shadow code when the pass is switched: rebuild the town's and the
    // Fighter's materials (the rig joins the scene after the build and goes back to the engine after the walk)
    const rebuild = () => { const touch = o => { for (const m of [].concat(o.material || [])) m.needsUpdate = true; }; scene.traverse(touch); window.app?.engine?.coach?.root?.traverse(touch); };
    // ---- the ladder
    const lockParam = /[?&]walkq=(\d)/.exec(location.search);
    const look = { level: -1, locked: lockParam ? Math.min(top, +lockParam[1]) : null, samples: [], clock: 0, dwell: 0, hold: 0, fails: 0 };
    function set(level) {
      level = Math.max(0, Math.min(top, level)); if (level === look.level) return;
      const [ratio, shadow, env] = LEVELS[level], wasShadow = sm.enabled;
      renderer.setPixelRatio(Math.min(dpr, ratio));
      if (shadow) { if (sun.shadow.mapSize.x !== shadow) { sun.shadow.mapSize.set(shadow, shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; } }
      sun.castShadow = !!shadow; sm.enabled = !!shadow; sm.type = THREE.PCFSoftShadowMap; sm.autoUpdate = true;
      if (wasShadow !== sm.enabled) rebuild(); // programs with / without the shadow code
      try { rlook?.high(env); } catch { /* cosmetic */ }
      look.level = level; look.dwell = 0; aim(aimAt ? aimAt[0] : 0, aimAt ? aimAt[1] : 0, true);
    }
    set(look.locked ?? top);
    let last = 0;
    const far = (L.fog?.[2] || 260) + 30; // nothing past the haze is drawn (the town's far tiles cost triangles and show only fog)
    look.update = (dt, p, camera) => {
      if (p) aim(p.x, p.z);
      if (camera?.isPerspectiveCamera && camera.far > far + 1) { camera.far = far; camera.updateProjectionMatrix(); }
      // adaptive quality from the real frame interval (not the clamped step): one step down when 90 % of frames are slower
      // than ~40 fps, one step back up after a long run of fast frames; a step that failed waits longer each time
      const now = performance.now(), raw = last ? (now - last) / 1000 : 0; last = now;
      if (look.locked !== null || !(raw > 0) || raw > .5) return;
      look.samples.push(raw); look.clock += raw; look.dwell += raw;
      if (look.samples.length < 45) return;
      const s = look.samples.sort((a, b) => a - b), p90 = s[Math.floor(s.length * .9)]; look.samples = [];
      if (p90 > .026 && look.level > 0 && look.dwell > 1.5) { set(look.level - (p90 > .06 ? 2 : 1)); look.fails++; look.hold = look.clock + Math.min(240, 20 * 2 ** look.fails); }
      else if (p90 < .0145 && look.level < top && look.dwell > 8 && look.clock > look.hold) set(look.level + 1);
    };
    look.lock = level => { look.locked = level === null || level === undefined ? null : Math.max(0, Math.min(top, level)); if (look.locked !== null) set(look.locked); };
    look.stats = () => ({ time, level: look.level, locked: look.locked, top, pixelRatio: renderer.getPixelRatio(), shadow: sm.enabled ? sun.shadow.mapSize.x : 0, env: !!scene.environment, look: L.look });
    look.dispose = () => {
      try { rlook?.dispose(); } catch { /* gone */ }
      renderer.setPixelRatio(was.ratio);
      const back = sm.enabled !== was.shadow; sm.enabled = was.shadow; sm.type = was.type; sm.autoUpdate = was.auto;
      sun.shadow.map?.dispose(); sun.shadow.map = null;
      if (back) rebuild();
      for (const x of own) x.dispose?.();
    };
    look.sunDir = dir;
    return look;
  }

  window.FreeWalkLook = { attach, facades, relief, tile, clip, inside, LIGHTS, LEVELS, WIN, SHADOW_R };
})();
