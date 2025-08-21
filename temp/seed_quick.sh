#!/usr/bin/env bash
# File: seed_quick.sh
# Path: /backend
# Author: Saša Kojadinović

set -euo pipefail

# Generiši vremena za +1, +3, +5, +7 minuta
T1=$(date -d "+1 minute" +%H:%M)
T2=$(date -d "+3 minutes" +%H:%M)
T3=$(date -d "+5 minutes" +%H:%M)
T4=$(date -d "+7 minutes" +%H:%M)

echo "[INFO] Kreiram template sa vremenima: $T1, $T2, $T3, $T4"

# Kreiraj bell_template
RESP=$(curl -sS -H "Content-Type: application/json" -X POST http://localhost:3000/api/bell-templates \
  -d "$(printf '{"name":"Brzi test","description":"auto quick seed","json_spec":{"rings":[{"time":"%s","label":"Почетак 1."},{"time":"%s","label":"Крај 1."},{"time":"%s","label":"Почетак 2."},{"time":"%s","label":"Крај 2."}]}}' "$T1" "$T2" "$T3" "$T4")")

TID=$(echo "$RESP" | sed -n 's/.*"id":[[:space:]]*\([0-9]\+\).*/\1/p')

TODAY=$(date +%F)
echo "[INFO] Template id=$TID → dodeljujem za datum $TODAY"

# Upis u day_schedule
curl -sS -H "Content-Type: application/json" -X PUT "http://localhost:3000/api/day-schedule/$TODAY" \
  -d "{\"bell_template_id\": $TID, \"is_holiday\": false, \"note\": \"quick-seed\"}"

echo
echo "[OK] Gotovo. Pogledaj /api/bell/next"
