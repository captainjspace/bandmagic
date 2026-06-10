#!/bin/bash
# Deploy band-portal to Cloud Run.
# Triggered by git tag in CI, or run manually.
# Usage: ./scripts/deploy.sh [IMAGE_TAG]

set -euo pipefail

PROJECT=rollingblackoutapp
REGION=us-central1
SERVICE=band-portal
SA="band-portal@${PROJECT}.iam.gserviceaccount.com"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"
TAG="${1:-latest}"

echo "Deploying ${IMAGE}:${TAG} to Cloud Run..."

gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}:${TAG}" \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --service-account "${SA}" \
  --no-allow-unauthenticated \
  --port 8080 \
  --set-env-vars "FIRESTORE_PROJECT_ID=rollingblackoutapp,FIRESTORE_DATABASE_ID=rollingblackoutapp-fsdb,GCS_BUCKET=rollingblackoutband,GCS_PREFIX=2026/" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3

echo "Deploy complete."
echo "Domain mapping: superblackout.rollingblackoutband.com"
