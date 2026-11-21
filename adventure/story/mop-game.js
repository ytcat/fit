/* Bruno's gym cleaning shift. The mop follows real pointer rays onto the 3D floor. */
(() => {
  'use strict';
  const V = (x = 0,y = 0,z = 0) => new THREE.Vector3(x,y,z);
  const L = (en,he,ru) => ({ en,he,ru });
  const Core = () => window.MopCore;
  const words = {
    en: { title: 'Clean the gym', goal: 'Clean floor', help: 'Drag the mop back and forth over the dirt.', keyboard: 'Arrow keys to move, hold Space to scrub.', finish: 'Finish shift', pay: 'Pay +{n} ◈' },
    he: { title: 'לנקות את האולם', goal: 'רצפה נקייה', help: 'גררו את המגב הלוך ושוב על הלכלוך.', keyboard: 'חצים לתנועה, רווח לחוץ כדי לשפשף.', finish: 'סיום משמרת', pay: 'שכר +{n} ◈' },
    ru: { title: 'Уборка зала', goal: 'Чистый пол', help: 'Водите шваброй по грязи туда и обратно.', keyboard: 'Стрелки — движение, удерживайте пробел для уборки.', finish: 'Закончить', pay: 'Оплата +{n} ◈' }
  };
  const fallback = L('Take your time. Leave the floor clean.', 'בלי למהר. תשאירו את הרצפה נקייה.', 'Не спеши. Оставь пол чистым.');
  function mount({ surface, canvas, camera, getSim }) {
    let active = null;
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(V(0,1,0), 0), at = V(), ndc = new THREE.Vector2();
    const rect = () => canvas.getBoundingClientRect();
    const point = (cx,cy) => {
      const r = rect();
      if (!r.width || !r.height || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
      ndc.set(2*(cx-r.left)/r.width-1, 1-2*(cy-r.top)/r.height);
      camera.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane,at)) return null;
      const p = { x: at.x, z: at.z };
      return Core().inFloor(p) ? p : null;
    };
    const clear = () => {
      const id = active; active = null; getSim()?.clearInput();
      if (id != null && surface.hasPointerCapture?.(id)) surface.releasePointerCapture(id);
    };
    const onDown = e => {
      if (active !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const p = point(e.clientX,e.clientY);
      if (!p || !getSim()?.begin(p)) return;
      active = e.pointerId; e.preventDefault(); surface.focus({ preventScroll:true }); surface.setPointerCapture?.(active);
    };
    const onMove = e => {
      if (active !== e.pointerId) return;
      e.preventDefault();
      const p = point(e.clientX,e.clientY);
      if (!p) { clear(); return; }
      getSim()?.drag(p);
    };
    const onEnd = e => { if (e.pointerId === active) clear(); };
    const stopEvents = ['pointerup','pointercancel','lostpointercapture'];
    surface.addEventListener('pointerdown',onDown); surface.addEventListener('pointermove',onMove);
    for (const e of stopEvents) surface.addEventListener(e,onEnd);
    for (const e of ['resize','blur']) window.addEventListener(e,clear);
    surface.addEventListener('blur',clear);
    return {
      clear,
      dispose() {
        clear(); surface.removeEventListener('pointerdown',onDown); surface.removeEventListener('pointermove',onMove); surface.removeEventListener('blur',clear);
        for (const e of stopEvents) surface.removeEventListener(e,onEnd);
        for (const e of ['resize','blur']) window.removeEventListener(e,clear);
      },
      project(x,z) { camera.updateMatrixWorld(); const p=V(x,0,z).project(camera), r=rect(); return { x:r.left+(p.x+1)*r.width/2, y:r.top+(1-p.y)*r.height/2 }; }
    };
  }
  function props(scene) {
    const R = Core().MOP, g = new THREE.Group(), bin = new Set();
    g.name = 'Gym floor and mop'; scene.add(g);
    const own = x => (bin.add(x),x);
    const material = (color,opts = {}) => own(new THREE.MeshStandardMaterial({ color, roughness:.68, ...opts }));
    const mesh = (geo,mat,parent = g) => { const m=new THREE.Mesh(own(geo),mat); parent.add(m); return m; };
    const width = R.maxX-R.minX, depth=R.maxZ-R.minZ, cv=document.createElement('canvas'); cv.width=640; cv.height=512;
    const ctx=cv.getContext('2d'), t=own(new THREE.CanvasTexture(cv));
    t.colorSpace=THREE.SRGBColorSpace;
    const floor=mesh(new THREE.PlaneGeometry(width,depth).rotateX(-Math.PI/2),own(new THREE.MeshBasicMaterial({ map:t, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, toneMapped:false })));
    floor.position.set((R.minX+R.maxX)/2,.011,(R.minZ+R.maxZ)/2); floor.renderOrder=2;
    const handle = mesh(new THREE.CylinderGeometry(.018,.018,1,9),material('#bb8e56')); handle.castShadow = true;
    const head = new THREE.Group(); g.add(head);
    const holder=mesh(new THREE.BoxGeometry(.42,.053,.155),material('#246b74'),head); holder.position.y=.065;
    const neck=mesh(new THREE.CylinderGeometry(.035,.058,.11,10),material('#547f86'),head); neck.position.y=.122;
    const cotton=material('#eae5cd'), strand=new THREE.CylinderGeometry(.013,.02,.136,5); strand.rotateX(Math.PI/2); own(strand);
    for (let i=0;i<22;i++) {
      const m=new THREE.Mesh(strand,cotton);
      m.position.set((i%11-5)*.035,.031,(i<11?-.055:.055));
      m.rotation.y=(i%5-2)*.11; head.add(m);
    }
    const ring=mesh(new THREE.RingGeometry(.88,1,32).rotateX(-Math.PI/2),own(new THREE.MeshBasicMaterial({ color:'#e1ffe8', transparent:true, opacity:.78, depthWrite:false, toneMapped:false })));
    ring.scale.setScalar(R.radius*1.19); ring.renderOrder=3;
    const pail=mesh(new THREE.CylinderGeometry(.22,.163,.335,16,1,true),material('#206d73',{ side:THREE.DoubleSide }));
    pail.position.set(2.78,.167,3.6); pail.castShadow=true;
    const water=mesh(new THREE.CircleGeometry(.203,16).rotateX(-Math.PI/2),material('#7cc5be',{ roughness:.18 }));
    water.position.set(2.78,.285,3.6);
    const grip=mesh(new THREE.BoxGeometry(.28,.065,.14),material('#d5a44e')); grip.position.set(2.78,.353,3.52);
    return { g,bin,ctx,t,handle,head,ring };
  }
  function dispose(P) { if (!P) return; P.g.parent?.remove(P.g); for (const o of P.bin) o.dispose(); }
  function paint(P,sim) {
    const R=Core().MOP, c=P.ctx, W=c.canvas.width, H=c.canvas.height, sx=W/(R.maxX-R.minX), sz=H/(R.maxZ-R.minZ);
    const X=x=>(x-R.minX)*sx, Z=z=>(z-R.minZ)*sz;
    c.clearRect(0,0,W,H);
    // Subtle floor corners mark the usable area, not lanes or a puzzle grid.
    c.strokeStyle='rgba(247,219,156,.54)'; c.lineWidth=2;
    for (const ax of [1,-1]) for (const az of [1,-1]) {
      const x=ax>0?8:W-8, z=az>0?8:H-8;
      c.beginPath();c.moveTo(x+ax*15,z);c.lineTo(x,z);c.lineTo(x,z+az*15);c.stroke();
    }
    for (const s of sim.spots) {
      const x=X(s.x), z=Z(s.z);
      if (s.left<s.dots.length) {
        const k=1-s.left/s.dots.length, f=c.createRadialGradient(x,z,1,x,z,.39*sx);
        f.addColorStop(0,'rgba(218,255,215,'+(.43*k)+')'); f.addColorStop(.68,'rgba(193,243,208,'+(.21*k)+')'); f.addColorStop(1,'rgba(193,243,208,0)');
        c.fillStyle=f; c.fillRect(x-.42*sx,z-.42*sx,.84*sx,.84*sx);
        if (!s.left) {
          c.strokeStyle='rgba(219,255,229,.71)'; c.lineWidth=1.8;
          for (const [dx,dz,n] of [[0,0,7],[11,-7,4],[-10,7,3]]) { c.beginPath(); c.moveTo(x+dx-n,z+dz);c.lineTo(x+dx+n,z+dz);c.moveTo(x+dx,z+dz-n);c.lineTo(x+dx,z+dz+n);c.stroke(); }
        }
      }
      for (const [i,d] of s.dots.entries()) if (d.left) {
        const px=X(d.x), pz=Z(d.z), r=(i===0?.155:.103+(i%3)*.012)*sx;
        const f=c.createRadialGradient(px-r*.18,pz-r*.21,1,px,pz,r);
        f.addColorStop(0,'rgba(54,40,32,.86)'); f.addColorStop(.64,'rgba(58,43,33,.78)'); f.addColorStop(.88,'rgba(79,52,36,.5)'); f.addColorStop(1,'rgba(79,52,36,0)');
        c.fillStyle=f;c.fillRect(px-r,pz-r,r*2,r*2);
        c.fillStyle='rgba(129,106,78,.38)';
        for(let k=0;k<3;k++) { c.beginPath();c.ellipse(px+Math.cos(i+k*2.3)*r*.45,pz+Math.sin(i+k*2.3)*r*.37,1.6+(k%2),1.1,.35,0,7);c.fill(); }
      }
    }
    P.t.needsUpdate=true;
  }
  const game = {
    set:'dream_gym', place:'gym', wear:'street', roles:{ fighter:{rig:'fighter'},bruno:{rig:'bruno'} }, direct:true, words, mount,
    make:()=>new (Core().MopTrial)(), job:'clean_gym', pay:n=>Core().pay(n),
    keymap:{ ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',' ':'wipe' },
    say(phase,res) {
      const kind=phase==='intro'?'job':'job_'+(res?.stars||0);
      return {who:'bruno',id:'clean_gym',kind,text:window.AdventureStory?.lines?.clean_gym?.[kind]?.[0]?.text||fallback};
    },
    hud(v,w) { return { goal:w.goal+' · '+v.score+'%', prompt:'', kind:'', arrow:'', ring:-1 }; },
    detail(res,w) { return w.goal+' '+res.value+'% · '+res.cleaned+'/'+Core().MOP.spots.length; },
    dispose(x) { dispose(x.scene?.userData.mop); if(x.scene) x.scene.userData.mop=null; },
    frame(x,v,dt) {
      const P=x.scene.userData.mop||(x.scene.userData.mop=props(x.scene)), m=x.memo, { point:p }=v;
      if (m.sim!==x.sim || m.revision!==v.revision) { m.sim=x.sim; m.revision=v.revision; paint(P,x.sim); }
      const f=x.rigs.fighter, b=x.rigs.bruno, Pose=window.DreamPose;
      const target=V(p.x,0,p.z-.67), last=m.root?.clone()||target.clone();
      m.root=(m.root||target.clone()).lerp(target,x.reduced?1:Math.min(1,dt*13+.02));
      // A quick pointer jump should not stretch the mop through the fighter.
      if(m.root.distanceTo(target)>.31) m.root.lerp(target,.72);
      const speed=m.root.distanceTo(last)/Math.max(.016,dt); m.walk=(m.walk||0)+m.root.distanceTo(last);
      f.root.position.copy(m.root); f.root.rotation.set(0,0,0);f.root.updateMatrixWorld(true);
      const foot=V(p.x,.13,p.z), local=f.root.worldToLocal(foot.clone()), upper=V(local.x*.42,1.03,.28), shaft=upper.clone().sub(local).normalize(), lower=upper.clone().addScaledVector(shaft,-.38);
      Pose.civil(f,{t:x.t,dt,dist:m.walk,walk:x.reduced?0:Math.min(1,speed*.32),arms:{L:'low',R:'low'},reach:{L:lower.toArray(),R:upper.toArray()},lean:.26,drop:.06,look:{yaw:0,pitch:-.37}});
      const grip=f.joints.handR.localToWorld(V(0,-.07,.02)), axis=grip.clone().sub(foot).normalize(), end=grip.clone().addScaledVector(axis,.15);
      P.handle.position.copy(foot).lerp(end,.5); P.handle.scale.set(1,foot.distanceTo(end),1);P.handle.quaternion.setFromUnitVectors(V(0,1,0),axis);
      P.head.position.set(p.x,0,p.z);P.ring.position.set(p.x,.022,p.z);P.ring.visible=v.active;
      b.root.position.set(2.35,0,.0); b.root.rotation.set(0,-.44,0); b.root.updateMatrixWorld(true);
      Pose.civil(b,{t:x.t,dt,arms:{L:'cross',R:'cross2'},look:{yaw:-.22,pitch:-.11},talk:x.over&&x.t-x.overAt<2.3?1:0});
      // Keep the whole 2D sweep reachable on a narrow phone while retaining the actual gym, gloves-off outfit and shadows.
      return { pos:[0,4.99,9.15], look:[0,.16,2.55], fit:[], minHorizontal:43 };
    }
  };
  function register(){ if(window.StoryScenes?.games && !window.StoryScenes.games.clean_gym) window.StoryScenes.games.clean_gym=game; }
  if(window.StoryScenes) register(); else window.addEventListener('DOMContentLoaded',register);
  window.MopGame={register,game,words};
})();
