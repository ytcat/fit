/* Token-only accent alternatives for GOTR-0015.
   A is the default shipped in design-tokens.css (crimson, "red corner").
   To adopt B or C, copy its values over the same tokens in design-tokens.css; no other CSS changes. */
module.exports={
 A:{},
 /* B: electric blue. Information moves to cyan so it stays distinct from the accent. */
 B:{
  '--gr-accent-rgb':'41 98 255','--gr-accent-hover':'#1f55eb','--gr-accent-press':'#1947c8','--gr-accent-ink':'#fff','--gr-accent-text':'#7aa5ff',
  '--gr-info-rgb':'34 211 238','--gr-info-text':'#67e8f9'
 },
 /* C: volt/lime on graphite. Neutral greys replace the cool blue-black; labels on the accent turn dark. */
 C:{
  '--gr-bg':'#0b0c0d','--gr-surface':'#131416','--gr-surface-2':'#1b1d20','--gr-surface-3':'#26292d','--gr-surface-4':'#33373c',
  '--gr-border':'#2e3236','--gr-border-strong':'#474c52','--gr-text':'#f5f6f4','--gr-text-muted':'#a9aeb0','--gr-text-faint':'#82888b',
  '--gr-accent-rgb':'200 255 46','--gr-accent-hover':'#b7ef1b','--gr-accent-press':'#a0d50f','--gr-accent-ink':'#0f1400','--gr-accent-text':'#c8ff2e',
  '--gr-scrim':'rgb(5 5 6/.76)','--gr-scene-chip':'rgb(11 12 13/.78)','--gr-scene-chip-strong':'rgb(11 12 13/.92)','--gr-stage-top':'#282b2f','--gr-stage-bottom':'#0e0f10'
 }
};
