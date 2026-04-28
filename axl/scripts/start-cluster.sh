#!/bin/bash
set -euo pipefail

AXL_DIR="$(dirname "$0")/.."
AXL_BIN="$AXL_DIR/axl"

if [ ! -f "$AXL_BIN" ]; then
  echo "AXL binary not found. Build first:"
  echo "  cd axl && make build"
  echo "  OR: cd axl && make docker-start"
  exit 1
fi

# Generate keys if missing
"$AXL_DIR/scripts/generate-keys.sh"

echo "Starting AXL cluster..."

# Start fire node (bootstrap)
echo "  Starting fire node (port 9002)..."
"$AXL_BIN" -config "$AXL_DIR/config-fire.json" &
FIRE_PID=$!
sleep 2

# Start water node
echo "  Starting water node (port 9012)..."
"$AXL_BIN" -config "$AXL_DIR/config-water.json" &
WATER_PID=$!
sleep 1

# Start coordinator node
echo "  Starting coordinator node (port 9022)..."
"$AXL_BIN" -config "$AXL_DIR/config-coordinator.json" &
COORD_PID=$!
sleep 2

echo ""
echo "AXL cluster running:"
echo "  fire:        PID $FIRE_PID  API http://127.0.0.1:9002"
echo "  water:       PID $WATER_PID  API http://127.0.0.1:9012"
echo "  coordinator: PID $COORD_PID  API http://127.0.0.1:9022"
echo ""

# Verify topology
echo "Checking topology..."
for port in 9002 9012 9022; do
  PEERS=$(curl -s "http://127.0.0.1:$port/topology" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  port {port}: {len(d.get(\"peers\", []))} peers')" 2>/dev/null || echo "  port $port: not ready yet")
  echo "$PEERS"
done

echo ""
echo "Press Ctrl+C to stop all nodes"
wait
