/* GOTR-0046 glossary (owner, 2026-11-11): the game name and real boxing terms stay in English in every
   language; everything else is translated. Shared by the UI and by qa/gotr-0046/i18n-audit.cjs. */
(() => {
 const game='Glory of the Ring';
 // Boxing terms, written as the player sees them. Longer phrases first so the audit removes them whole.
 const terms=[game,'Shadowboxing','Shadowbox','Sparring','Lead hook','Rear hook','Lead uppercut','Rear uppercut','Slip left','Slip right','Uppercut','Hook','Jab','Cross','Slip','Roll','Guard','Combos','Combo','KO','Burst','VS','First Rhythm','Corner Turn','Counter Chain','Thunder Arc','Rolling Return','School Signature'];
 // Move ids whose shown name is a glossary term (the technique table's English column).
 const moves={jab:'Jab',cross:'Cross',hook:'Lead hook',rear_hook:'Rear hook',uppercut:'Lead uppercut',rear_uppercut:'Rear uppercut',slip:'Slip right',slip_left:'Slip left',slip_right:'Slip right',roll:'Roll',guard:'Guard'};
 const combos={first_rhythm:'First Rhythm',corner_turn:'Corner Turn',counter_chain:'Counter Chain',thunder_arc:'Thunder Arc',rolling_return:'Rolling Return',school_signature:'School Signature'};
 const stations={none:'Shadowboxing',rabbit:'Sparring'};
 // Inside Hebrew text an English term is a first-strong isolate, so punctuation stays where it belongs.
 const isolate=text=>'⁨'+text+'⁩';
 const term=(text,lang)=>lang==='he'?isolate(text):text;
 // Removes the allowed English terms from a text; what is left must not contain Latin letters.
 const strip=text=>terms.reduce((s,t)=>s.split(t).join(' '),String(text).replace(/[⁨⁩]/g,''));
 // Longest first, so that a phrase (Rolling Return) is removed before a word inside it (Roll).
 terms.sort((a,b)=>b.length-a.length);
 const api={game,terms,moves,combos,stations,isolate,term,strip};
 if(typeof module!=='undefined'){module.exports=api;return;}
 window.GotrGlossary=api;
 // The shared technique table feeds move buttons, lessons, cues and drill names: keep the English term there.
 const table=window.COACH_TECHNIQUES;
 if(table)for(const [id,name] of Object.entries(moves)){const row=table[id];if(row&&row[1]===name){row[3]=isolate(name);row[5]=name;}}
})();
