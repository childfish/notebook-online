#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/.runtime"
LOG_FILE="$LOG_DIR/server.log"
URL="http://127.0.0.1:8000"

mkdir -p "$LOG_DIR"

if ! curl -sf "$URL/" >/dev/null 2>&1; then
  cd "$PROJECT_DIR"
  nohup python3 "$PROJECT_DIR/app/server.py" >>"$LOG_FILE" 2>&1 &
  sleep 1
fi

open "$URL"
