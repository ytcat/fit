// Model Safari's callback decoder, interrupted state and rejected first unlock.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=html.slice(html.indexOf('    class AudioEngine'),html.indexOf('    /* MASTER APPLICATION CONTROLLER'));
let starts=0,resumes=0,constructed=0,decoded=0;
class SafariAudio {
 constructor(){constructed++;this.state='suspended';this.sampleRate=24000;this.destination={};}
 createBuffer(ch,length){return {length,duration:length/24000};}
 createBufferSource(){return {connect(){},disconnect(){},start(){starts++;}};}
 resume(){resumes++;if(resumes>1)this.state='running';return Promise.resolve();}
 decodeAudioData(bytes,success){decoded++;queueMicrotask(()=>success({duration:.2}));/* callback-only Safari API */}
}
const context={window:{AudioContext:SafariAudio,navigator:{audioSession:{type:'ambient'}},fetch:async url=>({ok:!url.includes('body-2'),arrayBuffer:async()=>new ArrayBuffer(8)})}};
vm.runInNewContext(source+';globalThis.Audio=AudioEngine;',context);
(async()=>{
 const a=new context.Audio();a.init(true);assert.equal(starts,1,'a buffer must start synchronously inside the user gesture');assert.equal(a.ctx.state,'suspended');
 a.init(true);assert.equal(a.ctx.state,'running','later taps must retry unlock, not consume a once-only listener');assert.equal(starts,2);
 await a.loading;assert.equal(a.samples.size,10,'one failed asset must not discard every other sound');assert.equal(decoded,10,'callback-only decoders must be awaited');assert.equal(context.window.navigator.audioSession.type,'playback','Safari playback session must not use ambient silent-switch behavior');
 a.init(true);assert.equal(starts,2,'an already running context needs no repeated unlock buffer');
 a.ctx.state='interrupted';a.init(true);assert.equal(a.ctx.state,'running');assert.equal(starts,3,'returning from a phone interruption must re-unlock');
 a.ctx.state='closed';a.output={old:true};a.init(true);assert.equal(constructed,2);assert.equal(a.output,null,'a new context must not reconnect through the old output graph');
 assert.ok(html.includes("['pointerup','touchend','click']")&&!html.includes("pointerdown',()=>{if(!this.audio.muted)"),'activation must cover taps after load and resume');
 console.log('PASS persistent mobile audio unlock, silent-switch playback session, interrupted/closed recovery, callback decoding and partial-download fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
