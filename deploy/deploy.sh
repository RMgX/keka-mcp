#!/usr/bin/env bash
# Deploy keka-mcp onto RMgX-MCP-Host.
#
# Runs from the project-scoped GitLab runner hosted ON the MCP host (tag: mcp-host),
# so it needs no AWS credentials and no SSH keys: the runner already is the machine.
# The checkout at $APP_DIR is persistent, which is what makes tag-based rollback
# possible (the previous commit's image is still on disk).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rmgx/keka-mcp}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-keka-mcp}"
KEEP_IMAGES="${KEEP_IMAGES:-5}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/health}"
PUBLIC_URL="${PUBLIC_URL:-https://keka.mcp.rmgx.in/mcp}"

cd "$APP_DIR"

log() { printf '\n==> %s\n' "$*"; }

target="${CI_COMMIT_SHA:-$(git rev-parse origin/main)}"
prev="$(git rev-parse HEAD 2>/dev/null || true)"

wait_healthy() {
  local cid="$1" state=""
  for _ in $(seq 1 40); do
    state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo missing)"
    [ "$state" = healthy ] && return 0
    [ "$state" = missing ] && { sleep 2; continue; }
    sleep 3
  done
  echo "container did not become healthy (last state: $state)" >&2
  docker compose logs --tail 30 "$COMPOSE_SERVICE" >&2 || true
  return 1
}

rollback() {
  [ -n "${prev:-}" ] || { echo "no previous commit recorded; manual intervention required" >&2; return 0; }
  local tag="${prev:0:7}"
  log "rolling back to $tag"
  git checkout --force "$prev" || true
  if docker image inspect "keka-mcp:$tag" >/dev/null 2>&1; then
    KEKA_IMAGE="keka-mcp:$tag" docker compose up -d --no-build
  else
    docker build -t "keka-mcp:$tag" . && KEKA_IMAGE="keka-mcp:$tag" docker compose up -d --no-build
  fi
  echo "rollback state: $(docker compose ps --format '{{.Status}}' "$COMPOSE_SERVICE")"
}
trap 'echo "DEPLOY FAILED"; rollback' ERR

log "target ${target:0:7} (currently running ${prev:0:7})"
git fetch --prune origin
git checkout --force "$target"
tag="$(git rev-parse --short HEAD)"

log "building keka-mcp:$tag"
docker build --label "org.opencontainers.image.revision=$tag" -t "keka-mcp:$tag" .

log "starting container"
KEKA_IMAGE="keka-mcp:$tag" docker compose up -d --no-build

wait_healthy "$(docker compose ps -q "$COMPOSE_SERVICE")"
trap - ERR

log "internal health endpoint"
curl -fsS -m 10 "$HEALTH_URL" >/dev/null && echo "ok"

# The public endpoint must refuse an unauthenticated call. A 200 here would mean the
# bearer-token gate regressed, so fail loudly and roll back.
log "public auth gate (expect 401)"
code="$(curl -sS -m 15 -o /dev/null -w '%{http_code}' -X POST "$PUBLIC_URL" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')"
if [ "$code" != "401" ]; then
  echo "expected 401 from $PUBLIC_URL, got $code" >&2
  false
fi
echo "401 as expected"

log "pruning old images (keep $KEEP_IMAGES)"
docker images keka-mcp --format '{{.Tag}}' | grep -v "^${tag}$" | tail -n +"$((KEEP_IMAGES))" \
  | xargs -r -I{} docker rmi "keka-mcp:{}" >/dev/null 2>&1 || true

log "deployed $tag"
