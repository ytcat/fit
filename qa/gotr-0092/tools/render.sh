#!/usr/bin/env bash
# render.sh <plan> <workDir> <sheet.webp> <cols> frame... : plan -> frames -> contact sheet (server: APP_URL, default port 8613)
cd "$(dirname "$0")/../../.." || exit 1
plan=$1 work=$2 sheet=$3 cols=$4; shift 4
python3 qa/gotr-0092/tools/plan.py "$work" >/dev/null
timeout 900 node qa/gotr-0092/tools/shots.cjs "$work/$plan.json" "$work/f" 2>&1 | grep -v "GL Driver"
python3 qa/gotr-0092/tools/sheet.py "$work/f" "$sheet" "$cols" "$@"
