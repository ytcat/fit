#!/usr/bin/env bash
# Owner preview: cast and street clothes (front, 3/4, side) and frames of the opening film at 402x690, then two contact sheets.
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0078/slice1
run() { timeout 560 node $T/run.cjs "$T/$1" 402 690 2>&1 | grep -v "GL Driver" | tail -1; }
WHO=bruno VIEWS=front,34,side run cast.js
WHO=brick VIEWS=front,34,side run cast.js
WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,side TAG=lion-street run cast.js
SPECIES=rabbit WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,side TAG=rabbit-street run cast.js
TAG=film SCENE=dream_opening SHOTS=01-map-high:0.3,02-map-dive:2.1,04-bus-arriving:6.4,06-stepping-off:8.5,08-the-city:14,10-walking-front:21,11-crossing:24.6,12-gym-door:31 run film.js
python3 $T/sheet.py
