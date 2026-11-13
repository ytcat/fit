#!/usr/bin/env bash
# Owner preview at 402x690. Usage: preview.sh [cast] [street] [film]  (default: cast)
# cast   = lion, rabbit, Bruno, Brick: full body and head, front / 3-4 / side, same camera -> owner-preview-cast/heads.webp
# street = lion and rabbit in street clothes with the bag -> owner-preview-street.webp ; film = opening film frames
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0078/slice1
run() { timeout 560 node $T/run.cjs "$T/$1" 402 690 2>&1 | grep -v "GL Driver" | tail -1; }
for part in ${@:-cast}; do case $part in
cast) for w in ${WHOS:-lion rabbit bruno brick}; do WHO=$w VIEWS=front,34,side run cast.js; WHO=$w ZOOM=head VIEWS=front,34,side run cast.js; done; python3 $T/sheet.py cast heads;;
street) WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,side TAG=lion-street run cast.js; SPECIES=rabbit WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,side TAG=rabbit-street run cast.js; python3 $T/sheet.py street;;
film) TAG=film SCENE=dream_opening SHOTS=01-map-high:0.3,02-map-dive:2.1,04-bus-arriving:6.4,06-stepping-off:8.5,08-the-city:14,10-walking-front:21,11-crossing:24.6,12-gym-door:31 run film.js; python3 $T/sheet.py film;;
esac; done
