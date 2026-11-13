#!/usr/bin/env bash
# Frames of existing street scenes for the outfit rule. Usage: rule.sh before|after
cd "$(dirname "$0")/../../../.." || exit 1
T=qa/gotr-0078/slice1/tools; export OUT=qa/gotr-0078/slice1
for s in arrival:7.5 vix_intro:5 carry_bag:4; do SCENE=${s%%:*} AT=${s##*:} TAG=outfit-rule-$1 timeout 400 node $T/run.cjs $T/oldscene.js 402 690 2>&1 | grep -v "GL Driver" | tail -1; done
