#!/bin/sh
set -eu

fail() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

info() {
  printf '%s\n' "copilot-dash-azd: $*" >&2
}

get_env_value() {
  key="$1"
  eval "value=\${$key:-}"
  if [ -n "${value:-}" ]; then
    printf '%s' "$value"
    return 0
  fi
  if command -v azd >/dev/null 2>&1; then
    azd env get-value "$key" 2>/dev/null || true
  fi
}

require_env() {
  key="$1"
  value="$(get_env_value "$key")"
  [ -n "$value" ] || fail "$key is required"
  printf '%s' "$value"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found in PATH"
}

is_true() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    true|1|yes|y|on) return 0 ;;
    *) return 1 ;;
  esac
}

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

postgres_url() {
  user="$1"
  password="$2"
  host="$3"
  database="$4"
  printf 'postgres://%s:%s@%s:5432/%s?sslmode=require' "$(urlencode "$user")" "$(urlencode "$password")" "$host" "$database"
}
