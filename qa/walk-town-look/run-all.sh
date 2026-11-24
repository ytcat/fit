#!/usr/bin/env bash
# Walk town look: every capture of the evidence, two chains side by side (SwiftShader is slow: ~5 min a phone picture).
#   qa/walk-town-look/run-all.sh <scratch dir> <baseline tree (git archive of 67ddca4)>
# Pictures land in <scratch>/{before,after}; sheets are made with qa/walk-town-look/sheet.py.
set -u
S="$1"; BASE="$2"; cd "$(dirname "$0")/../.."
shot() { timeout 3600 node qa/walk-town-look/shots.cjs "$@"; }
(
  ROOT="$BASE" shot "$S/before" before phone morning > "$S/log-before-phone-morning.txt" 2>&1
  shot "$S/after" after phone evening gym,busstop,market,otto,docks > "$S/log-after-phone-evening.txt" 2>&1
  shot "$S/after" after phone night gym,busstop,market,otto,docks > "$S/log-after-phone-night.txt" 2>&1
  GFX=low shot "$S/after-low" after phone morning gym,market,docks > "$S/log-after-low.txt" 2>&1
) &
(
  ROOT="$BASE" shot "$S/before" before pc morning > "$S/log-before-pc-morning.txt" 2>&1
  ROOT="$BASE" shot "$S/before" before phone night gym,market,docks > "$S/log-before-phone-night.txt" 2>&1
  shot "$S/after" after pc evening gym,market,otto,docks > "$S/log-after-pc-evening.txt" 2>&1
  shot "$S/after" after pc night gym,market,docks > "$S/log-after-pc-night.txt" 2>&1
) &
wait
echo all done
