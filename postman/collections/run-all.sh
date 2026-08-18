#!/usr/bin/env bash
# Runs every Giga collection against production and prints a per-module summary.
set -u
ENV=Giga-Production.postman_environment.json
pass=0; fail=0
for c in Giga-*.postman_collection.json; do
  out=$(npx --yes newman run "$c" -e "$ENV" --timeout-request 30000 --delay-request 400 \
        --reporters cli --reporter-cli-no-assertions --reporter-cli-no-console --reporter-cli-no-banner 2>&1)
  a=$(echo "$out" | grep -E '^\│ *assertions' | grep -oE '[0-9]+' | tr '\n' ' ')
  set -- $a; ex=${1:-0}; fl=${2:-0}
  pass=$((pass+ex-fl)); fail=$((fail+fl))
  printf '%-46s assertions=%-5s failed=%s\n' "$c" "$ex" "$fl"
done
echo "-----"; echo "TOTAL passed=$pass failed=$fail"
