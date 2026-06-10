#!/bin/bash
# One-time IAM setup for band-portal service account.
# Run once per environment. Does not deploy the app.

set -euo pipefail

SA="band-portal@rollingblackoutapp.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create band-portal \
  --display-name="Band Portal" \
  --project=rollingblackoutapp

# Firestore read/write (releases, notes, catalog)
gcloud projects add-iam-policy-binding rollingblackoutapp \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"

# GCS read-only (audio streaming, catalog sync)
gcloud projects add-iam-policy-binding rollingblackoutstorage \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectViewer"

echo "Service account ${SA} configured."
