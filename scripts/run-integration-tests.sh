#!/usr/bin/env bash
# Runs the full e2e integration test suite:
#   1. Starts the React dev server (proxying to test backend on :9091)
#   2. Delegates to Maven, which starts the backend via TestContainers and runs Playwright
#
# Usage: ./scripts/run-integration-tests.sh
#
# Requirements:
#   - Docker running (TestContainers needs it for MariaDB + RabbitMQ)
#   - Node.js / npm installed
#   - Maven installed
#   - my-tools project already built: cd ../my-tools && mvn install -DskipTests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REACT_DIR="$SCRIPT_DIR/.."
BACKEND_DIR="$SCRIPT_DIR/../../my-tools"

# ── Start React dev server with integration proxy config ──────────────────────
echo "=== Starting React dev server (integration mode, proxy → http://localhost:9091) ==="
cd "$REACT_DIR"
npm run dev:integration &
DEV_PID=$!

cleanup() {
  echo "=== Stopping React dev server (pid $DEV_PID) ==="
  kill "$DEV_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for the React dev server to be ready (up to 60s)
echo "Waiting for React dev server at http://localhost:5173 ..."
MAX_WAIT=60
WAITED=0
until curl -sf http://localhost:5173 > /dev/null 2>&1; do
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: React dev server did not start within ${MAX_WAIT}s" >&2
    exit 1
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done
echo "React dev server is ready."

# ── Run Maven integration test ─────────────────────────────────────────────────
# ReactE2ETest starts the Spring Boot backend (via TestContainers) and runs Playwright.
echo "=== Running backend integration test (TestContainers + Spring Boot + Playwright) ==="
cd "$BACKEND_DIR"
mvn test -pl my-tools-vaadin-app -DfailIfNoTests=false -Dsurefire.failIfNoSpecifiedTests=false -Dtest=ReactRunAllE2ETest -am
