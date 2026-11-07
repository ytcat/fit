const fileSystem=require('fs'),vm2=require('vm');if(process.env.APP_ROOT)process.chdir(process.env.APP_ROOT);global.require=require('module').createRequire(process.cwd()+'/tests/training-motion.test.cjs');const prefix=fileSystem.readFileSync('tests/training-motion.test.cjs','utf8').split("for(const species of ['lion','rabbit']){")[0];vm2.runInThisContext(prefix+`
e.player.setEnabled(true);
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 e.animTime=0;e.arena.setTarget('pads');e.player.reset();assert.ok(e.player.press(move));let hits=0,reach=0;
 for(let i=0;i<=120;i++){e.animTime=i/120;const f=e.arena.update(e.animTime);hits+=f.contacts.length;if(f.hero.strike>.3)reach=Math.max(reach,...f.hero.handErrors);}
 console.log(move,{hits,reach});
}
console.log('Diagnostic completed; compare each real contact count against baseline.');
`);
