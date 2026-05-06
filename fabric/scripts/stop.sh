#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/env.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" down

echo "Red Fabric detenida"
