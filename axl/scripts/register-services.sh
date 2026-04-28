#!/bin/bash
set -euo pipefail

API_PORT=${1:-3001}

echo "Registering MCP services on AXL nodes..."
echo "Backend API: http://127.0.0.1:$API_PORT"

# Fire node services
echo "  Registering on fire node (9002)..."
curl -s -X POST http://127.0.0.1:9002/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"disasters\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/disasters\", \"description\": \"NASA EONET active disasters\"}" || echo "    Failed"

curl -s -X POST http://127.0.0.1:9002/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"fires\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/fires\", \"description\": \"NASA FIRMS fire hotspots\"}" || echo "    Failed"

curl -s -X POST http://127.0.0.1:9002/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"species\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/species\", \"description\": \"GBIF species occurrences\"}" || echo "    Failed"

# Water node services
echo "  Registering on water node (9012)..."
curl -s -X POST http://127.0.0.1:9012/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"water\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/water\", \"description\": \"USGS water services\"}" || echo "    Failed"

curl -s -X POST http://127.0.0.1:9012/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"observations\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/observations\", \"description\": \"iNaturalist observations\"}" || echo "    Failed"

# Coordinator node services
echo "  Registering on coordinator node (9022)..."
curl -s -X POST http://127.0.0.1:9022/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"fund\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/fund\", \"description\": \"Response Fund state\"}" || echo "    Failed"

curl -s -X POST http://127.0.0.1:9022/mcp/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"agents\", \"target_url\": \"http://127.0.0.1:$API_PORT/api/agents\", \"description\": \"Agent registry\"}" || echo "    Failed"

echo ""
echo "MCP services registered."
