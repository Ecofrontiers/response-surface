#!/bin/bash
set -euo pipefail

KEYS_DIR="$(dirname "$0")/../keys"
mkdir -p "$KEYS_DIR"

for name in fire water coordinator; do
  KEY_FILE="$KEYS_DIR/$name.pem"
  if [ -f "$KEY_FILE" ]; then
    echo "Key exists: $KEY_FILE (skipping)"
  else
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
    echo "Generated: $KEY_FILE"
  fi
done

echo ""
echo "Public keys:"
for name in fire water coordinator; do
  PUB=$(openssl pkey -in "$KEYS_DIR/$name.pem" -pubout -outform DER 2>/dev/null | xxd -p | tr -d '\n')
  echo "  $name: $PUB"
done
