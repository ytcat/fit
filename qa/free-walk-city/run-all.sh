#!/usr/bin/env bash
# Free walk QA (GOTR-0118): the walk across every district on foot, then each district in EN / HE / RU (and at night),
# then the story walk with a real save. Output: <out>/*.png, *.json and run.log.
set -u
cd "$(dirname "$0")/../.."
out="${1:-qa/free-walk-city/out}"; mkdir -p "$out"
timeout 3000 node qa/free-walk-city/tour.cjs "$out" en
for l in en he ru; do timeout 1800 node qa/free-walk-city/walk.cjs "$out" "$l"; done
timeout 1800 node qa/free-walk-city/walk.cjs "$out/night" he oldtown,neon,fair night
timeout 2400 node qa/free-walk-city/story.cjs "$out" en
echo "run-all: done"
