#!/usr/bin/env bash
# Run node tests in parallel. Usage:
#   scripts/run-tests.sh                 # all tests, jobs = free cores (min 1, max 4)
#   scripts/run-tests.sh -j 2 shop fight # only tests whose file name contains "shop" or "fight"
# Prints one line per failure and a summary: "files=N fails=F seconds=S".
set -u
cd "$(dirname "$0")/.."
jobs=""
if [ "${1:-}" = "-j" ]; then jobs="$2"; shift 2; fi
if [ -z "$jobs" ]; then
  load=$(cut -d' ' -f1 /proc/loadavg 2>/dev/null || echo 0); cores=$(nproc 2>/dev/null || echo 2)
  jobs=$(awk -v c="$cores" -v l="$load" 'BEGIN{j=int(c-l);if(j<1)j=1;if(j>4)j=4;print j}')
fi
files=$(ls tests/*.test.cjs)
if [ $# -gt 0 ]; then files=$(for f in $files; do for p in "$@"; do case "$f" in *"$p"*) echo "$f"; break;; esac; done; done); fi
n=$(echo "$files" | grep -c . || true); start=$(date +%s)
fails=$(echo "$files" | xargs -P "$jobs" -I{} sh -c 'timeout 900 node "{}" >/dev/null 2>&1 || echo "FAIL {}"')
[ -n "$fails" ] && echo "$fails"
f=$(echo "$fails" | grep -c FAIL || true)
echo "files=$n fails=$f jobs=$jobs seconds=$(( $(date +%s) - start ))"
[ "$f" -eq 0 ]
