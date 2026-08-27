#!/bin/bash
# ============================================================
# Araadhya Fashion - Auto-Start Server Script
# Runs automatically on Mac boot via LaunchAgent
# ============================================================

PROJECT_DIR="/Users/sachinkhandeshe/Desktop/Araadhya Fashion"
LOG_DIR="$PROJECT_DIR/logs"
NODE="/usr/local/bin/node"

mkdir -p "$LOG_DIR"

echo "$(date) | 🚀 Araadhya Fashion Server Starting..." >> "$LOG_DIR/server.log"

# Start the server
cd "$PROJECT_DIR"
exec "$NODE" dist/server.js >> "$LOG_DIR/server.log" 2>> "$LOG_DIR/server-error.log"
