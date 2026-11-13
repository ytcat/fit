#!/usr/bin/env bash
# GOTR-0078 slice 1 evidence: frames of the film, the conversations and the cast. Usage: evidence.sh [width height]
# Needs the worktree served on :8471 (python3 -m http.server 8471) and NODE_PATH with playwright.
cd "$(dirname "$0")/../../../.." || exit 1
W=${1:-402}; H=${2:-690}; T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0078/slice1
run() { timeout 560 node $T/run.cjs "$T/$1" "$W" "$H" 2>&1 | grep -v "GL Driver" | tail -${2:-2}; }
TAG=film SCENE=dream_opening SHOTS=01-map-high:0.3,02-map-dive:2.1,03-street-from-above:1.2,04-bus-arriving:5.9,05-doors-open:7.6,06-stepping-off:8.5,07-looks-up:11,08-the-city:14,09-walking:17.6,10-walking-front:21,11-crossing:24.6,12-gym-door:31 run film.js
TAG=talk SCENE=dream_gym_talk SHOTS=01-hall:1.6,02-two-shot:5.5,03-over-shoulder-fighter:9.5,04-over-shoulder-bruno:13.5,05-no-money:17.5,06-world-champion:25.5,07-whatever-is-needed:29.5,08-show-me:33.5,09-brick-steps-forward:38.8,10-brick:41.5 run film.js
TAG=after-loss SCENE=dream_after_brick SHOTS=01-got-up:1.2,02-bruno:5.5,03-job-offer:13.5,04-thanks:21.5 run film.js
TAG=after-win OUTCOME=win SCENE=dream_after_brick SHOTS=01-bruno:5.5,02-fighter:9.5 run film.js
WHO=bruno VIEWS=front,34,side run cast.js; WHO=bruno ZOOM=head VIEWS=front,34,side run cast.js
WHO=brick VIEWS=front,34,side run cast.js; WHO=brick ZOOM=head VIEWS=front,34,side run cast.js
WHO=brick KIT=1 VIEWS=34 TAG=brick-guard run cast.js
WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,b34 TAG=lion-street run cast.js
SPECIES=rabbit WHO=fighter OUTFIT=street BAG=1 VIEWS=front,34,b34 TAG=rabbit-street run cast.js
if [ "$W" = 402 ]; then SPECIES=rabbit TAG=film-rabbit SCENE=dream_opening SHOTS=06-stepping-off:8.5,10-walking-front:21 run film.js; LANG=he TAG=talk-he SCENE=dream_gym_talk SHOTS=05-no-money:17.5 run film.js; TAG=fight-brick run fight.js 1; fi
