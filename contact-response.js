/* Exact local spring response. No external physics engine or fixed frame rate. */
(() => {
 class ContactSpring {
  constructor(frequency=5,damping=.35){this.frequency=frequency;this.damping=damping;this.position=new THREE.Vector3();this.velocity=new THREE.Vector3();}
  reset(){this.position.set(0,0,0);this.velocity.set(0,0,0);}
  impulse(v){this.velocity.add(v).clampLength(0,30);}
  step(dt){
   if(!(dt>0))return;const w=this.frequency,z=this.damping,decay=Math.exp(-z*w*dt);
   for(const axis of ['x','y','z']){
    const x=this.position[axis],v=this.velocity[axis];
    if(z>=.999){const b=v+w*x;this.position[axis]=decay*(x+b*dt);this.velocity[axis]=decay*(v-w*b*dt);}
    else {const wd=w*Math.sqrt(1-z*z),c=Math.cos(wd*dt),s=Math.sin(wd*dt);this.position[axis]=decay*(x*c+(v+z*w*x)/wd*s);this.velocity[axis]=decay*(v*c-(z*w*v+w*w*x)/wd*s);}
   }
  }
 }
 window.ContactSpring=ContactSpring;
})();
