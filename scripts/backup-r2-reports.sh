#!/usr/bin/env bash
# Backup diario del bucket R2 `svi-reports` (única fuente de los reportes del fondo)
# hacia Backblaze B2 `baboon-backups/fondo-svi-reports`. Additive (copy, nunca borra),
# con push a Uptime Kuma (Telegram SVI) al terminar. Secretos desde 1Password.
set -euo pipefail

R2_BUCKET="svi-reports"
CF_ACCOUNT_ID="e01a09691fd658db4939cb40ad3526fd"
B2_DEST="b2:baboon-backups/fondo-svi-reports"

log() { echo "[$(date -Is)] $*"; }

kuma_push() {
  local status="$1" msg="$2"
  local url
  url="$(op item get 'Uptime Kuma Push - fondo-svi reports (R2 backup)' --vault 'Server Edvantage' --fields credential --reveal 2>/dev/null || true)"
  [ -n "$url" ] && curl -fsS -m 20 "${url}?status=${status}&msg=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$msg")&ping=" >/dev/null 2>&1 || true
}

fail() {
  log "ERROR: $1"
  kuma_push down "$1"
  exit 1
}
trap 'fail "fallo inesperado en linea $LINENO"' ERR

command -v wrangler >/dev/null || fail "wrangler no disponible"
command -v rclone   >/dev/null || fail "rclone no disponible"
command -v op       >/dev/null || fail "op (1Password) no disponible"

# --- Credenciales desde 1Password ---
export CLOUDFLARE_API_KEY="$(op item get 'Cloudflare - API Key (Global)' --vault 'Server Edvantage' --fields password --reveal)"
export CLOUDFLARE_EMAIL="$(op item get 'Cloudflare - API Key (Global)' --vault 'Server Edvantage' --fields username --reveal)"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

export RCLONE_CONFIG_B2_TYPE=b2
RCLONE_CONFIG_B2_ACCOUNT="$(op item get 'Backblaze B2 - Backups pgBackRest (baboon-backups)' --vault 'Server Edvantage' --fields username --reveal)"
RCLONE_CONFIG_B2_KEY="$(op item get 'Backblaze B2 - Backups pgBackRest (baboon-backups)' --vault 'Server Edvantage' --fields password --reveal)"
export RCLONE_CONFIG_B2_ACCOUNT RCLONE_CONFIG_B2_KEY

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"; fail "fallo inesperado en linea $LINENO"' ERR
cleanup() { rm -rf "$tmp_dir"; }

# --- Descargar todos los objetos del bucket R2 ---
log "Listando objetos de R2 $R2_BUCKET"
mapfile -t keys < <(curl -fsS "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects" \
  -H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" -H "X-Auth-Key: ${CLOUDFLARE_API_KEY}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(o["key"]) for o in (d.get("result") or [])]')

[ "${#keys[@]}" -gt 0 ] || fail "R2 no devolvio objetos (posible fallo de credenciales o bucket vacio)"

log "Descargando ${#keys[@]} objetos"
for key in "${keys[@]}"; do
  wrangler r2 object get "${R2_BUCKET}/${key}" --file="${tmp_dir}/${key}" --remote >/dev/null 2>&1 \
    || fail "no se pudo descargar ${key} de R2"
done

# --- Subir a Backblaze (copy: nunca borra del backup) ---
log "Subiendo a ${B2_DEST}"
rclone copy "$tmp_dir" "$B2_DEST" --transfers 4 --checkers 8 2>&1 | tail -5

total_mb="$(du -sm "$tmp_dir" | cut -f1)"
cleanup
trap - ERR
msg="OK: ${#keys[@]} reportes (${total_mb} MB) respaldados en ${B2_DEST}"
log "$msg"
kuma_push up "$msg"
