app_oauth_client_id=band-magic-test
app_oauth_client_credential_id=${app_oauth_client_id}-cred
app_oauth_cred_words="test credential"

project=rollingblackoutapp
region=us-central1
location=$location
oauth_client_description="An application registration"

oauth_display_name="Band Magic App"
client_type="CONFIDENTIAL_CLIENT" 
redirect_url=""

gcloud iam oauth-clients create $app_oauth_client_id \
    --project=$project \
    --location=$location \
    --client-type=$client_type \
    --display-name=$oauth_display_name \
    --description=$oauth_client_description \
    --allowed-scopes="https://www.googleapis.com/auth/cloud-platform" \
    --allowed-redirect-uris="$redirect_uri" \
    --allowed-grant-types="authorization_code_grant"
gcloud iam $oauth-clients list \
    --project=$project_id \
    --location=$location
gcloud iam oauth-clients describe $app_oauth_client_id \
    --project project_id \
    --location=$location

gcloud iam oauth-clients credentials create $app_oauth_client_credential_id \
    --oauth-client=$app_oauth_client_id \
    --display-name=$app_auth_cred_word \
    --location=$location

gcloud iam oauth-clients credentials list \
    --oauth-client=$app_oauth_client_id \
    --project=project_id \
    --location=$location
gcloud iam oauth-clients credentials describe $app_oauth_client_credential_id \
    --oauth-client=$app_oauth_client_id \
    --location=$location
