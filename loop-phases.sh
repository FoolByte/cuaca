#!/usr/bin/env bash
# loop-phases.sh
# Menjalankan Phase 0..10 dari PRD.md secara berurutan lewat Claude Code
# (headless mode). Berhenti otomatis kalau satu fase gagal, supaya bisa
# diperiksa manusia sebelum lanjut — jangan biarkan ini jalan tanpa
# pengawasan sama sekali.
#
# Jalankan di dalam container/VM terisolasi. Butuh: claude CLI, jq.

set -euo pipefail

PHASES=(0 1 2 3 4 5 6 7 8 9 10)
LOG_DIR="./logs/claude-loop"
mkdir -p "$LOG_DIR"

for phase in "${PHASES[@]}"; do
  echo "=== Mengerjakan Phase $phase ==="

  claude -p "/phase $phase" \
    --permission-mode acceptEdits \
    --allowedTools "Bash,Read,Write,Edit" \
    --max-turns 60 \
    --max-budget-usd 5 \
    --output-format json \
    > "$LOG_DIR/phase-$phase.json"

  is_error=$(jq -r '.is_error' "$LOG_DIR/phase-$phase.json")

  if [ "$is_error" != "false" ]; then
    echo ""
    echo ">>> Phase $phase GAGAL atau butuh perhatian."
    echo ">>> Cek log: $LOG_DIR/phase-$phase.json"
    echo ">>> Perbaiki manual, lalu jalankan ulang dari phase ini."
    exit 1
  fi

  echo "--- Phase $phase selesai, hasil tersimpan di $LOG_DIR/phase-$phase.json"
  echo "--- Ringkasan singkat:"
  jq -r '.result' "$LOG_DIR/phase-$phase.json" | head -n 10
  echo ""
  echo "=== Phase $phase OK ==="
  echo ""
done

echo "Semua fase (0-10) selesai dijalankan."
echo "WAJIB: review 'git log' dan 'git diff' tiap commit secara manual sebelum deploy."