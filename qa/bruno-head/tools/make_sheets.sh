#!/usr/bin/env bash
# Builds the review sheets in qa/bruno-head/ from the renders in $1 (studio.cjs final renders, films, gym, Blender views).
# usage: bash qa/bruno-head/tools/make_sheets.sh <render dir>   (the dir holds final/, films/, gym/, srceye/, finaleye/, srchead/, finalhead/)
set -eu
R="$1"; Q="$(cd "$(dirname "$0")/.." && pwd)"; S="$Q/tools/sheet.py"
V="front side back below q34 backq"
for pose in stand talk walk point count raise; do
  args=""; for tag in before after; do for v in $V; do args="$args $R/final/$pose-$v-$tag.png $tag-$pose-$v"; done; done
  python3 "$S" "$Q/seams-$pose-before-after.webp" "Head-neck-collar join, $pose (402x690 page renderer, close-ups): top before (code head), bottom after; views front, side, back, below at chest height, 3/4, back 3/4" 300 300 6 $args
done
args=""; for tag in before after; do for v in front q34 side back; do args="$args $R/final/body-$v-$tag.png body-$v-$tag"; done; done
python3 "$S" "$Q/body-before-after.webp" "Whole figure at phone size (402x690): top before, bottom after" 201 345 4 $args
args=""; for p in count raise point; do for tag in before after; do args="$args $R/final/ref-$p-$tag.png ref-$p-$tag"; done; done
for v in front q34; do for tag in before after; do args="$args $R/final/face-$v-$tag.png face-$v-$tag"; done; done
python3 "$S" "$Q/referee-face-before-after.webp" "Referee poses (count, wrist held high beside him, point) and the face: before / after pairs" 201 345 5 $args
args=""; for tag in before after; do for v in towel-front towel-top towel-back towel-side cord-front; do args="$args $R/final/$v-$tag.png $v-$tag"; done; done
python3 "$S" "$Q/towel-cord-before-after.webp" "Towel over the left shoulder and the whistle cord at the neck: top before, bottom after" 300 300 5 $args
args=""; for tag in before after; do for v in front side q34 below; do args="$args $R/final/chin-$v-$tag.png chin-$v-$tag"; done; done
python3 "$S" "$Q/chin-gesture-before-after.webp" "Hand-to-chin gesture (gym talk, apology film): top before, bottom after (the paw under the new, longer chin)" 300 300 4 $args
python3 "$S" "$Q/head-source-vs-game.webp" "TRELLIS.2 source (top) and the game head (bottom), Blender: front, side, back; eyes and brows close (cracks gone, eyes kept)" 340 340 4 \
  "$R/srchead/front.png" "source front" "$R/srchead/side.png" "source side" "$R/srchead/back.png" "source back" "$R/srceye/front.png" "source eyes/brows" \
  "$R/finalhead/front.png" "game front" "$R/finalhead/side.png" "game side (neck tube)" "$R/finalhead/back.png" "game back (nape)" "$R/finaleye/front.png" "game eyes/brows"
python3 "$S" "$Q/portrait-before-after.webp" "Story portrait: before (code head), after (model), cold start" 300 300 3 "$R/final/portrait-before.png" "before" "$R/final/portrait-after.png" "after" "$R/final/portrait-cold-first.png" "cold start first draw"
args=""; for tag in before after; do for v in raiseL-front raiseL-back waveoff; do args="$args $R/final/$v-$tag.png $v-$tag"; done; done
python3 "$S" "$Q/towel-arm-before-after.webp" "Towel with his left arm raised (referee, winner on his left) and the wave-off: top before, bottom after" 300 300 3 $args
# films: rows code head / the reviewed build (v2026112601) / this build; the close-ups carry the eye luminance (mean, max of 9x9 px)
for sc in "dream_gym_talk 5 13 21 33" "dream_apology 6 14 22 30"; do set -- $sc; id=$1; shift
  args=""; for tag in before v1 after; do i=0; for t in "$@"; do f="$R/films2/$id-$tag-0$i-$t-close.png"; lab=$(python3 -c "import json,sys;r=json.load(open('$R/films2/$id-$tag-auto.json'));e=[f for f in r['frames'] if f['t']==$t][0].get('eyes') or [];print('$tag $t s eyes '+' '.join('%s/%s'%(x['mean'],x['max']) for x in e if x['facing']>.5) )"); args="$args $f \"$lab\""; i=$((i+1)); done; done
  eval python3 "$S" "$Q/film-${id#dream_}-eyes.webp" "\"${id#dream_} film, head close-ups from the film camera: rows code head, reviewed build (dark sockets), this build; labels: eye mean/max luminance\"" 300 300 4 $args
  args=""; for tag in before after; do i=0; for t in "$@"; do f=$(ls $R/films2/$id-$tag-0$i-$t.png); args="$args $f $tag-${t}s"; i=$((i+1)); done; done
  python3 "$S" "$Q/film-${id#dream_}-frames.webp" "${id#dream_} film at 402x690 (framing): top code head, bottom this build" 201 345 4 $args
done
cp "$R/gym-sheet.webp" "$Q/gym-referee-before-after.webp" 2>/dev/null || true
rm -f "$Q/film-gymtalk.webp" "$Q/film-gymtalk-close.webp" "$Q/film-apology.webp" "$Q/film-gym_talk.webp"
ls -la "$Q"/*.webp
