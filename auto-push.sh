#!/bin/bash
cd "$(dirname "$0")"

while true; do
  echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > .activity
  git add .activity
  git commit -m "chore: activity $(date -u +"%Y-%m-%d %H:%M:%S")"
  git push origin main
  sleep 60
done
