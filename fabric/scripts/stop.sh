#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export FABRIC_SCRIPT_DIR="${SCRIPT_DIR}"
. "${SCRIPT_DIR}/env.sh"

docker compose -f "${FABRIC_DIR}/docker-compose.fabric.yml" down

echo "Red Fabric detenida"
