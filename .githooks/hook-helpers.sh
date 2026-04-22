#!/bin/sh

run_pnpm_script() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run "$1"
  else
    corepack pnpm run "$1"
  fi
}

staged_files_match() {
  git diff --cached --name-only --diff-filter=ACMR | grep -Eq "$1"
}

run_pnpm_script_if_staged_matches() {
  log_label="$1"
  script_name="$2"
  staged_pattern="$3"
  skip_message="$4"

  if staged_files_match "$staged_pattern"; then
    echo "[pre-commit] $log_label"
    run_pnpm_script "$script_name"
  else
    echo "[pre-commit] skip $skip_message"
  fi
}
