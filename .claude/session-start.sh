#!/bin/bash
# SessionStart hook: install dependencies in the background so tests and
# builds work immediately in Claude Code web sessions.
set -euo pipefail

echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"
if [ ! -d node_modules ]; then
  npm ci
fi
