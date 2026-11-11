#!/bin/bash
# usage: c.sh endpoint [json]   |  c.sh js <file>  | c.sh shot <name> [full]
D=$(cd "$(dirname "$0")" && pwd)
Q=$D/../raw; mkdir -p "$Q"
case "$1" in
  js) curl -s -m 600 -X POST http://127.0.0.1:9172/run -d "{\"file\":\"$D/$2\"}";;
  shot) curl -s -m 300 -X POST http://127.0.0.1:9172/shot -d "{\"path\":\"$Q/$2.png\",\"full\":${3:-false}}";;
  *) curl -s -m 600 -X POST "http://127.0.0.1:9172/$1" -d "${2:-{\}}";;
esac
echo
