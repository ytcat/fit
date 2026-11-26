#!/usr/bin/env bash
# Round 5 look sheets (the owner's "much more natural, more face details"): rows code head / round 4 / now.
# usage: bash qa/bruno-head/tools/make_look_sheets.sh <render dir>  (look/ from studio.cjs plan-look.json, the round-4 rows with
# HEAD_FILE=<round-4 glb> and names -now -> -r4; films5/ from film.cjs: BEFORE=1, TAG=r4 HEAD_FILE=<round-4 glb>, and the build)
set -eu
R="$1"; Q="$(cd "$(dirname "$0")/.." && pwd)"; S="$Q/tools/sheet.py"
args=""; for tag in code r4 now; do for v in front q34 side back eyes muzzle talk; do args="$args $R/look/look-$v-$tag.png $tag-$v"; done; done
python3 "$S" "$Q/look-studio.webp" "Bruno's head, studio at 402x690 in the page renderer: rows code head / round 4 / now; front, 3/4, side, back, eyes, muzzle, talking (jaw open)" 201 345 7 $args
for kind in frame close; do
  args=""; for tag in before r4 after; do for st in "dream_gym_talk 13" "dream_gym_talk 21" "dream_gym_talk 33" "dream_apology 6" "dream_apology 22"; do set -- $st
    if [ $kind = frame ]; then f=$(ls $R/films5/$1-$tag-0?-$2.png | head -1); else f=$(ls $R/films5/$1-$tag-0?-$2-close.png | head -1); fi
    lab=$(echo $tag | sed 's/before/code/;s/after/now/')-${1#dream_}-$2s; args="$args $f $lab"; done; done
  if [ $kind = frame ]; then python3 "$S" "$Q/look-films.webp" "Films at 402x690 (gym talk 13/21/33 s, apology 6/22 s): rows code head / round 4 / now" 201 345 5 $args
  else python3 "$S" "$Q/look-films-close.webp" "Film close-ups from the film camera's side (3/4 and side views as the film frames them): rows code head / round 4 / now" 300 300 5 $args; fi
done
ls -la "$Q"/look-*.webp
