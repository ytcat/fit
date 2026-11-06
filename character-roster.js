/* One cached rig per species. Selection changes the instructor, never the motion. */
(() => {
 if(window.COACH_TECHNIQUES)window.COACH_TECHNIQUES.guard=['STANCE','Stance','Keep a comfortable staggered stance, knees soft, chin tucked and both gloves near the cheeks.','עמידה','עמידה מדורגת ונוחה, ברכיים רכות, סנטר פנימה וכפפות ליד הלחיים.','Стойка','Удобная разноимённая стойка, мягкие колени, подбородок опущен, перчатки у щёк.'];
 class CoachRoster {
  constructor(engine, data) { this.engine=engine; this.data=data; this.coaches={[engine.coach.species]:engine.coach}; }
  static preferred() { try { return localStorage.getItem('shadowbox-coach')==='rabbit'?'rabbit':'lion'; } catch (_) { return 'lion'; } }
  get(species) { return this.coaches[species]||(this.coaches[species]=new LionCoach(this.data,{species})); }
  select(species) {
   if(!['lion','rabbit'].includes(species)||this.engine.targetMode==='fight')return false;
   this.engine.career?.finish();
   const e=this.engine,playing=e.isPlaying,mode=e.targetMode||'none';
   e.coach.root.parent?.remove(e.coach.root);
   e.coach=this.get(species);e.demoModel=e.activeModel=e.coach.root;
   e.mixer?.stopAllAction();e.mixer=null;e.actions={};e.activeAction=null;e.animTime=0;
   e.arena.setTarget(mode);e.isPlaying=playing;e.lastRenderStamp=null;
   try { localStorage.setItem('shadowbox-coach',species); } catch (_) {}
   window.dispatchEvent(new CustomEvent('shadowbox-character',{detail:{species}}));
   return true;
  }
 }
 window.CoachRoster=CoachRoster;
})();
