/* Opt-in Chapter 1 walking prototype. World metres; route follows the existing pavement and zebra crossing. */
(() => {
  const START = 15.6, TARGET = Object.freeze([27, -6.85]), SPEED = 2.22, RADIUS = .72;
  const NORTH = [22.2, -4.95], SOUTH = [22.2, 5.05], APPROACH = [27, -5.35];
  const YAW = -1, PITCH = .96, DIST = 9.95, FOV = 40, DEFAULT_ZOOM = 1.12;
  const DEADZONE = .14, STICK_TRAVEL = .32;
  const RIGHT = [Math.cos(YAW), -Math.sin(YAW)], UP = [-Math.sin(YAW), -Math.cos(YAW)];
  const BOXES = [
    [2.15, 24.35, 4.28, 6.65], // near pavement; the shelters and café tables are outside it
    [20.45, 24.0, -5.3, 5.45], // the walkable width of the actual zebra crossing
    [20.35, 28.4, -6.12, -4.28], // far pavement
    [26.16, 27.84, -7.34, -5.55] // entrance, between the planters and away from the steps
  ];
  // Masked/offline prototype caps are labelled separately from curbs, street furniture and the gym entrance.
  // Positions are on the stock collision seam; frame depth lies wholly outside editable pedestrian space.
  const BLOCKS = Object.freeze([
    ['station-west',0,0,-1], ['station-east',0,1,1],
    ['gym-west',2,0,-1], ['gym-east',2,1,1]
  ].map(([id,box,end,out]) => Object.freeze({id,x:BOXES[box][end],z0:BOXES[box][2],z1:BOXES[box][3],out})));
  function boundaryMesh(T) {
    const p=[],n=[],c=[],v=new T.Vector3(), normal=new T.Vector3();
    const indexed=new T.BoxGeometry(), unit=indexed.toNonIndexed();
    indexed.dispose();
    const pos=unit.attributes.position, ns=unit.attributes.normal;
    const paint={iron:new T.Color('#273c43').convertSRGBToLinear(),
      white:new T.Color('#efece2').convertSRGBToLinear(), red:new T.Color('#9f4139').convertSRGBToLinear()};
    function box(x,y,z,a,b,d,mat){
      const q=paint[mat];
      for(let i=0;i<pos.count;i++){
        v.fromBufferAttribute(pos,i);normal.fromBufferAttribute(ns,i);
        p.push(x+v.x*a,y+v.y*b,z+v.z*d);
        n.push(normal.x,normal.y,normal.z);c.push(q.r,q.g,q.b);
      }
    }
    for(const {x,z0,z1,out} of BLOCKS){
      // Mid-height movable barricade, not the ground-level illuminated completion ring.
      const center=(z0+z1)/2, len=z1-z0, rail=x+out*.09;
      for(const z of [z0+.10,z1-.10]){
        box(rail,.418,z,.12,.836,.10,'iron');
        box(x+out*.16,.036,z,.30,.072,.22,'iron');
        box(rail,.84,z,.137,.035,.118,'white');
      }
      box(rail,.32,center,.08,.12,len,'iron');
      box(rail,.715,center,.085,.174,len,'red');
      const w=len/7;
      for(let i=0;i<7;i++) if(i%2===0)box(x+out*.044,.715,z0+w*(i+.5),.010,.155,w*.93,'white');
    }
    unit.dispose();
    const geo=new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(p,3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(n,3));
    geo.setAttribute('color', new T.Float32BufferAttribute(c,3));
    geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:0}));
    mesh.name='Physical pedestrian boundary (walk prototype only)';
    return mesh;
  }
  const TREE = [11.6, 5.4], signs = [[5.2, 3.95], [19.7, 4], [24.7, 4], [19.7, -4], [24.7, -4]];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const allowed = (x, z) => BOXES.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d) &&
    gap([x,z], TREE) > .48 && signs.every(p => gap(p,[x,z]) > .36);
  function route(x, z) {
    const nearEdge = z > 4.28, farEdge = z < -4.28;
    const detour = !nearEdge || x >= 12.35 ? [] : x < 10.43
      ? [[10.78,4.67], [12.48,4.67]]
      : [[12.48,z > TREE[1] ? 6.16 : 4.67]];
    const path = farEdge
      ? (Math.abs(x - TARGET[0]) > .52 ? [APPROACH, TARGET] : [TARGET])
      : ((nearEdge && Math.abs(x - SOUTH[0]) > .61) ? [...detour, SOUTH, NORTH, APPROACH, TARGET] : [NORTH, APPROACH, TARGET]);
    return { next: path[0], meters: path.reduce((sum, point, i) => sum + gap(i ? path[i - 1] : [x, z], point), 0) };
  }
  function state(x, z, ry = 0) {
    return { x, z, ry, dist: 0, walking: false, y: 0, arrived: false };
  }
  function move(s, horizontal, vertical, dt) {
    s.walking = false;
    if (s.arrived || !dt || !(horizontal || vertical)) return;
    const length = Math.hypot(horizontal, vertical);
    const x = (RIGHT[0] * horizontal + UP[0] * vertical) / length;
    const z = (RIGHT[1] * horizontal + UP[1] * vertical) / length;
    const step = SPEED * Math.min(1,length) * Math.min(dt, .065), oldX = s.x, oldZ = s.z;
    if (allowed(s.x + x * step, s.z + z * step)) { s.x += x * step; s.z += z * step; }
    else if (allowed(s.x + x * step, s.z)) s.x += x * step;
    else if (allowed(s.x, s.z + z * step)) s.z += z * step;
    const dx = s.x - oldX, dz = s.z - oldZ, dist = Math.hypot(dx, dz);
    if (dist > 1e-5) { s.ry = Math.atan2(dx, dz); s.dist += dist; s.walking = true; }
    if (gap([s.x, s.z], TARGET) <= RADIUS) { s.arrived = true; s.walking = false; }
  }
  /** Convert screen pixels to a radial analog input; screen-up is positive camera-relative forward. */
  function stickInput(dx, dy, radius) {
    const length = Math.hypot(dx,dy);
    if (!Number.isFinite(length) || !Number.isFinite(radius) || radius <= 0 || length <= radius*DEADZONE) return [0,0];
    const magnitude = (Math.min(1,length/radius)-DEADZONE)/(1-DEADZONE);
    return [dx/length*magnitude, -dy/length*magnitude];
  }
  const labels = {
    en: ['Movement stick (arrow keys or WASD)', 'Zoom in', 'Zoom out', 'm'],
    he: ['ג׳ויסטיק תנועה (מקשי חצים או WASD)', 'זום פנימה', 'זום החוצה', 'מ׳'],
    ru: ['Стик движения (стрелки или WASD)', 'Приблизить', 'Отдалить', 'м']
  };
  function enabled(search) { return new URLSearchParams(search).get('walkPrototype') === '1'; }
  function introSkip(phase) {
    return phase==='walk' ? 'ignore' : phase==='load' ? 'latch' : 'start';
  }
  function resumePoint(resumeKey) {
    if (resumeKey) try {
      const p = JSON.parse(sessionStorage.getItem('fit.walkPrototype.v1:' + resumeKey));
      if (p && allowed(p.x, p.z) && gap([p.x, p.z], TARGET) > RADIUS) return { x:p.x, z:p.z, ry:Number.isFinite(p.ry) ? p.ry : 0 };
    } catch { /* private mode */ }
    return null;
  }
  function open({ dialog, scene, camera, actor, lang, reduced, resumeKey }) {
    const T = window.THREE, s = state(actor.x, actor.z, actor.ry);
    const key = resumeKey ? 'fit.walkPrototype.v1:' + resumeKey : null;
    let savedAt = -1;
    Object.assign(s, resumePoint(resumeKey));
    const node = (tag, cls, text) => { const a = document.createElement(tag); a.className = cls; if (text) a.textContent = text; return a; };
    const layer = node('div', 'walk-layer'), pad = node('div', 'walk-stick'), thumb = node('span', 'walk-stick-thumb'), zoom = node('div', 'walk-zoom'), hud = node('div', 'walk-hud'), arrow = node('span', 'walk-arrow', '➤'), meters = node('span', 'walk-meters');
    layer.dir = 'ltr'; hud.append(arrow, meters); layer.append(pad, zoom, hud); dialog.append(layer); dialog.dataset.walk = 'true';
    const pressed = new Set(), abort = new AbortController(), on = (n, name, fn) => n.addEventListener(name, fn, { signal: abort.signal });
    const strings = labels[lang] || labels.en, buttons = {};
    let targetZoom = DEFAULT_ZOOM, zoomValue = DEFAULT_ZOOM, indicator = -1;
    const zoomBy = n => { targetZoom = clamp(Math.round((targetZoom+n)*100)/100, .64, 1.48); buttons.in.disabled = targetZoom === .64; buttons.out.disabled = targetZoom === 1.48; layer.dataset.zoom = targetZoom; };
    function button(where, id, glyph, title) {
      const b = node('button', 'walk-button walk-'+id, glyph);
      b.type = 'button'; b.dataset.walkControl = id; b.setAttribute('aria-label', title); where.append(b); buttons[id] = b; return b;
    }
    pad.tabIndex = 0; pad.dataset.walkControl = 'stick'; pad.dataset.active = 'false';
    pad.setAttribute('role','group'); pad.setAttribute('aria-label',strings[0]);
    thumb.setAttribute('aria-hidden','true'); pad.append(thumb);
    let activeId = null, analog = [0,0];
    const setAnalog = ev => {
      const r = pad.getBoundingClientRect(), radius = Math.min(r.width,r.height)*STICK_TRAVEL;
      const dx = ev.clientX - (r.left + r.width*.5), dy = ev.clientY - (r.top + r.height*.5);
      analog = stickInput(dx,dy,radius);
      thumb.style.transform = 'translate(-50%,-50%) translate('+ (analog[0]*radius)+'px,'+(-analog[1]*radius)+'px)';
    };
    const release = id => {
      if (activeId === null || id !== activeId) return;
      activeId = null; analog = [0,0]; pad.dataset.active = 'false'; thumb.style.transform = '';
      try { if (pad.hasPointerCapture?.(id)) pad.releasePointerCapture(id); } catch { /* released by the device */ }
    };
    const clear = () => { release(activeId); pressed.clear(); };
    on(pad,'pointerdown',ev => {
      if (activeId !== null || ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault(); ev.stopPropagation();
      activeId = ev.pointerId; pad.dataset.active = 'true';
      try { pad.setPointerCapture?.(activeId); } catch { /* window still sees final release */ }
      setAnalog(ev);
    });
    // Listen on the window too for Safari lost-capture and any pointer leaving the stick.
    on(window,'pointermove',ev => { if (ev.pointerId === activeId) setAnalog(ev); });
    on(pad,'lostpointercapture',ev => release(ev.pointerId));
    on(window,'pointerup',ev => release(ev.pointerId));
    on(window,'pointercancel',ev => release(ev.pointerId));
    on(button(zoom,'in','+',strings[1]), 'click', () => zoomBy(-.14));
    on(button(zoom,'out','−',strings[2]), 'click', () => zoomBy(.14));
    layer.dataset.zoom = String(DEFAULT_ZOOM);
    const keys = { ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right' };
    on(window,'keydown', ev => {
      const id = keys[ev.code];
      if (id) { ev.preventDefault(); pressed.add(ev.code); }
      else if (['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(ev.code)) { ev.preventDefault(); if (!ev.repeat) zoomBy(ev.code === 'Equal' || ev.code === 'NumpadAdd' ? -.14 : .14); }
    });
    on(window,'keyup', ev => pressed.delete(ev.code));
    on(window,'blur',clear);
    on(document,'visibilitychange',() => { if (document.hidden) clear(); });
    const save = () => { if (key && !s.arrived) try { sessionStorage.setItem(key, JSON.stringify({ x:s.x,z:s.z,ry:s.ry })); } catch { /* unavailable */ } };
    on(window,'pagehide',save);

    const ring = new T.Group(), basis = new T.Vector3(), center = new T.Vector3(s.x,.70,s.z);
    ring.position.set(TARGET[0],.025,TARGET[1]); ring.name = 'Prototype entrance ring';
    const surface = (geo, color, opacity) => {
      const material = new T.MeshBasicMaterial({ color, opacity, transparent:true, depthWrite:false, toneMapped:false, polygonOffset:true, polygonOffsetFactor:-2 });
      const m = new T.Mesh(geo,material); m.rotation.x = -Math.PI/2; m.renderOrder = 2; ring.add(m); return m;
    };
    const disc = surface(new T.CircleGeometry(.71,40),0x33e2c9,.24);
    const rim = surface(new T.RingGeometry(.64,.74,40),0x91fff2,.98);
    const pulse = surface(new T.RingGeometry(.73,.77,40),0x55ffe3,.5);
    rim.position.y = .007; pulse.position.y = .014; scene.add(ring);
    const boundaries=boundaryMesh(T); scene.add(boundaries);
    function frame(dt) {
      const p = new Set(Array.from(pressed,code=>keys[code]));
      const x = Number(p.has('right'))-Number(p.has('left')), y = Number(p.has('up'))-Number(p.has('down'));
      // Keyboard can be used independently; its diagonal is clamped to the same full-tilt pace.
      move(s, x || y ? x : analog[0], x || y ? y : analog[1],dt);
      if (s.walking && s.dist - savedAt > .8) { savedAt = s.dist; save(); }
      const t = route(s.x,s.z), left = s.arrived ? 0 : Math.max(1, Math.round(t.meters));
      if (left !== indicator) { indicator=left; meters.textContent = left+' '+strings[3]; }
      const dx=t.next[0]-s.x, dz=t.next[1]-s.z;
      arrow.style.transform='rotate('+Math.atan2(-Math.sin(PITCH)*(dx*UP[0]+dz*UP[1]), dx*RIGHT[0]+dz*RIGHT[1])+'rad)';
    }
    function view(look, dt, clock) {
      zoomValue += (targetZoom-zoomValue)*(reduced ? 1 : 1-Math.exp(-dt*10));
      basis.set(s.x,.7,s.z);
      center.lerp(basis,reduced ? 1 : 1-Math.exp(-dt*10));
      look.copy(center);
      const d = DIST*zoomValue, flat = Math.cos(PITCH)*d;
      camera.position.set(look.x+Math.sin(YAW)*flat,look.y+Math.sin(PITCH)*d,look.z+Math.cos(YAW)*flat);
      camera.lookAt(look);
      const wiggle = reduced ? 0 : .5+.5*Math.sin(clock*4.2);
      pulse.scale.setScalar(1+.27*wiggle); pulse.material.opacity=.52-.40*wiggle;
      disc.material.opacity=.19+.17*wiggle;
    }
    function close(complete) {
      abort.abort(); clear(); layer.remove(); delete dialog.dataset.walk;
      scene.remove(boundaries); boundaries.geometry.dispose(); boundaries.material.dispose();
      scene.remove(ring); for (const m of ring.children) { m.geometry.dispose(); m.material.dispose(); }
      if (complete && key) try { sessionStorage.removeItem(key); } catch { /* unavailable */ }
      else save();
    }
    return { s, frame, view, close };
  }
  const api = { BLOCKS, boundaryMesh, START, TARGET, RADIUS, FOV, DIST, DEFAULT_ZOOM, SPEED, introSkip, stickInput, DEADZONE, STICK_TRAVEL, RIGHT, UP, enabled, allowed, route, state, move, open, resumePoint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.StreetWalkPrototype = api;
})();
