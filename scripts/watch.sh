#!/usr/bin/env bash

echo "Watching Reado health..."

fail_count=0
error_rate=0

while true; do
  metrics="$(curl -s http://localhost:5001/metrics)"
  error_rate="$(echo "$metrics" | awk '/error_rate/ {print $2}')"

  if awk "BEGIN {exit !($error_rate > 0.05)}"; then
    ((fail_count++))
    echo "Bad sample ($fail_count) error_rate=$error_rate"
  else
    fail_count=0
  fi

  if [ "$fail_count" -ge 20 ]; then
    echo "ALERT: sustained high error rate"
    break
  fi

  sleep 2
done

