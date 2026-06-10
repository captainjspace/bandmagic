#!/bin/bash
# One-time setup: Workload Identity Federation for GitHub Actions.
# Allows GitHub Actions to deploy to Cloud Run without service account keys.
#
# Usage: ./scripts/setup-workload-identity.sh
#
# After running, add these to GitHub repo secrets:
#   WIF_PROVIDER   — output: workload identity provider resource name
#   WIF_SERVICE_ACCOUNT — output: deploy SA email

set -euo pipefail

PROJECT_ID="rollingblackoutapp"
REPO="captainjspace/bandmagic"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-provider"
DEPLOY_SA="band-portal-deploy"
DEPLOY_SA_EMAIL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Creating deploy service account..."
gcloud iam service-accounts create "${DEPLOY_SA}" \
  --display-name="Band Portal CI Deploy" \
  --project="${PROJECT_ID}"

echo "==> Granting deploy SA permissions..."
# Push images to Container Registry
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/storage.admin"

# Deploy to Cloud Run
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/run.developer"

# Attach the app service account to Cloud Run
gcloud iam service-accounts add-iam-policy-binding \
  "band-portal@${PROJECT_ID}.iam.gserviceaccount.com" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"

echo "==> Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create "${POOL_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project="${PROJECT_ID}"

POOL_NAME=$(gcloud iam workload-identity-pools describe "${POOL_ID}" \
  --location="global" \
  --project="${PROJECT_ID}" \
  --format="value(name)")

echo "==> Creating GitHub OIDC provider..."
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_ID}" \
  --display-name="GitHub Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --project="${PROJECT_ID}"

PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_ID}" \
  --project="${PROJECT_ID}" \
  --format="value(name)")

echo "==> Binding deploy SA to pool..."
gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${REPO}" \
  --project="${PROJECT_ID}"

echo ""
echo "==> Done. Add these to GitHub repo secrets:"
echo ""
echo "  WIF_PROVIDER=${PROVIDER_NAME}"
echo "  WIF_SERVICE_ACCOUNT=${DEPLOY_SA_EMAIL}"
