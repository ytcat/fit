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
 class HangingBag extends ContactSpring {
  constructor({mass=45,radius=.235,height=1.15,offset=.94,damping=.20}={}){
   const transverse=mass*(offset*offset+height*height/12+radius*radius/4);
   super(Math.sqrt(mass*9.81*offset/transverse),damping);
   this.mass=mass;this.radius=radius;this.height=height;this.offset=offset;
   this.inertia=new THREE.Vector3(transverse,mass*radius*radius/2,transverse);
   this.gloveStiffness=8000;this.bagStiffness=12000;
   this.contactStiffness=1/(1/this.gloveStiffness+1/this.bagStiffness);
  }
  // One-shot collision impulse at the suspension pivot. Effective striking mass
  // is an animation parameter, not a claimed measurement of a human boxer.
  impact(point,normal,fistVelocity,strikingMass=5){
   const relative=fistVelocity.clone().sub(this.velocity.clone().cross(point));
   const closing=Math.max(0,-relative.dot(normal)),lever=point.clone().cross(normal);
   const inverseMass=1/strikingMass+lever.x**2/this.inertia.x+lever.y**2/this.inertia.y+lever.z**2/this.inertia.z;
   const impulse=1.05*closing/inverseMass;
   this.velocity.add(lever.multiplyScalar(-impulse).divide(this.inertia));
   return {impulse,closing};
  }
  contact(point,normal,fistVelocity,penetration,dt){
   const surfaceVelocity=this.velocity.clone().cross(point),relative=fistVelocity.clone().sub(surfaceVelocity);
   const closing=-relative.dot(normal),depth=Math.max(0,penetration);
   const normalForce=Math.max(0,Math.min(1200,this.contactStiffness*depth+45*closing));
   const tangent=relative.clone().addScaledVector(normal,closing),speed=tangent.length();
   const force=normal.clone().multiplyScalar(-normalForce);
   if(speed>1e-8)force.addScaledVector(tangent,Math.min(.30*normalForce,20*speed)/speed);
   const impulse=force.multiplyScalar(Math.max(0,dt));
   this.velocity.add(point.clone().cross(impulse).divide(this.inertia));
   return {normalForce,impulse:normalForce*Math.max(0,dt),closing,gloveDepth:depth*this.bagStiffness/(this.gloveStiffness+this.bagStiffness),bagDepth:depth*this.gloveStiffness/(this.gloveStiffness+this.bagStiffness)};
  }
 }
 window.ContactSpring=ContactSpring;window.HangingBag=HangingBag;
})();
