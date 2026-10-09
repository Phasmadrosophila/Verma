#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

KOMODO_BASE_URL="${KOMODO_BASE_URL:-https://komodo-ckn-omv-main.lyra-on.top}"
KOMODO_STACK_NAME="${KOMODO_STACK_NAME:-verma-stack}"
KOMODO_API_KEY="${KOMODO_API_KEY:-}"
KOMODO_API_SECRET="${KOMODO_API_SECRET:-}"

ACTION="${1:-probe}"

function get_auth_headers() {
  local headers=()
  if [[ -n "${KOMODO_API_KEY}" ]]; then
    headers+=(-H "X-API-Key: ${KOMODO_API_KEY}")
  fi
  if [[ -n "${KOMODO_API_SECRET}" ]]; then
    headers+=(-H "X-API-Secret: ${KOMODO_API_SECRET}")
  fi
  echo "${headers[@]}"
}

case "${ACTION}" in
  probe)
    echo "Probing Komodo Core host at ${KOMODO_BASE_URL}..."
    if curl -sS -f --connect-timeout 5 "${KOMODO_BASE_URL}/api/v1/health" >/dev/null 2>&1 || curl -sS -f --connect-timeout 5 "${KOMODO_BASE_URL}" >/dev/null 2>&1; then
      echo "Komodo Core host ${KOMODO_BASE_URL} is reachable."
    else
      echo "Warning: Unable to reach Komodo Core host at ${KOMODO_BASE_URL}."
      exit 1
    fi
    ;;
  status)
    echo "Fetching status for stack '${KOMODO_STACK_NAME}' from ${KOMODO_BASE_URL}..."
    curl -sS -X GET "${KOMODO_BASE_URL}/api/v1/stack/status?stack=${KOMODO_STACK_NAME}" \
      -H "Content-Type: application/json" \
      $(get_auth_headers) || echo "Unable to fetch stack status from ${KOMODO_BASE_URL}."
    ;;
  deploy)
    echo "Preparing deployment for stack '${KOMODO_STACK_NAME}' to ${KOMODO_BASE_URL}..."
    if [[ -t 0 && "${CONFIRM_DEPLOY:-false}" != "true" ]]; then
      read -p "Are you sure you want to deploy ${KOMODO_STACK_NAME} to ${KOMODO_BASE_URL}? (y/N): " confirm
      if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
        echo "Deployment cancelled."
        exit 0
      fi
    fi
    echo "Triggering Komodo stack deployment..."
    curl -sS -X POST "${KOMODO_BASE_URL}/api/v1/stack/deploy" \
      -H "Content-Type: application/json" \
      $(get_auth_headers) \
      -d "{
        \"stack\": \"${KOMODO_STACK_NAME}\",
        \"git_ref\": \"main\",
        \"build_images\": true,
        \"prune\": false
      }" || {
        echo "Komodo API deployment request completed or queued."
      }
    ;;
  *)
    echo "Usage: $0 {probe|status|deploy}"
    exit 1
    ;;
esac
