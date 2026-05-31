#!/bin/sh
set -e

echo "==> Starting AI-Bucherstellung..."
exec node apps/web/server.js
