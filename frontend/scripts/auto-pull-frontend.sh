#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-feature/navbar-redesign}"
INTERVAL="${INTERVAL:-8}"
MIRROR_FRONTEND="${MIRROR_FRONTEND:-false}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "[Stayzy Frontend Pull] Listening for 'frontend/' updates on origin/${BRANCH} (every ${INTERVAL}s)..."
echo "[Stayzy Frontend Pull] Press Ctrl+C to stop."

while true; do
  if git fetch origin "$BRANCH" --quiet 2>/dev/null; then
    BEHIND="$(git rev-list --count "HEAD..origin/${BRANCH}" 2>/dev/null || echo 0)"
    if [ "${BEHIND}" -gt 0 ]; then
      if [ "${MIRROR_FRONTEND}" = "true" ]; then
        git checkout -- frontend/ 2>/dev/null || true
        git clean -fd -- frontend/ 2>/dev/null || true
      fi

      if [ -n "$(git status --porcelain -- frontend/ ':!frontend/next-env.d.ts')" ] && [ "${MIRROR_FRONTEND}" != "true" ]; then
        git pull --rebase --autostash origin "$BRANCH" || true
      else
        if ! git pull --ff-only origin "$BRANCH"; then
          if [ "${MIRROR_FRONTEND}" = "true" ]; then
            git checkout "origin/${BRANCH}" -- frontend/
          fi
        fi
      fi
      echo "[$(date '+%H:%M:%S')] Updated frontend from origin/${BRANCH} (${BEHIND} commit(s))."
    fi
  fi
  sleep "$INTERVAL"
done
