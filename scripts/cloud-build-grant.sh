# Find your project number (it is 901961412597 based on your WIF string)
PROJECT_NUMBER="901961412597"
PROJECT_ID="rollingblackoutapp"
CB_SA="band-portal-deploy@rollingblackoutapp.iam.gserviceaccount.com";
#{PROJECT_NUMBER}@://gserviceaccount.com"

# Allow Cloud Build to manage Cloud Run services
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CB_SA" \
    --role="roles/run.developer"

# Allow Cloud Build to assign the runtime service account to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CB_SA" \
    --role="roles/iam.serviceAccountUser"
