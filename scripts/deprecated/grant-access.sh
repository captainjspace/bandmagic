#!/bin/bash
# Grant a band member access to the Cloud Run service.
# Usage: ./scripts/grant-access.sh user@rollingblackoutband.com

set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <email>"
  exit 1
fi

gcloud run services add-iam-policy-binding band-portal \
  --region=us-central1 \
  --project=rollingblackoutapp \
  --member="user:${1}" \
  --role="roles/run.invoker"

echo "Access granted to ${1}"
