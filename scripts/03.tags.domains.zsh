#!/usr/bin/env zsh
############################################################
# docker domains and tags :
#  rollingblackoutband.com \
#  rollingblackout.band \

############################################################



gcloud organizations list --format="value(ID)"| read organization_id

gcloud resource-manager tags keys list --parent=projects/rollingblackoutapp
gcloud resource-manager tags keys list \
  --parent=projects/rollingblackoutapp \
  --format="get(name)" | read -r -d' ' tag_keys
for tk in ${(f)tag_keys}; echo $((i++)), $tk;


for tk in ${(f)tag_keys}; gcloud resource-manager tags keys describe $tk       
gcloud resource-manager tags keys get-iam-policy $tk

for tk in ${(f)tag_keys}; gcloud resource-manager tags values list --parent=$tk

typeset -gxA tag=();
for tk in ${(f)tag_keys}; do
  typeset -a valueArr=()
  gcloud resource-manager tags values list \
    --parent=$tk \
    --format="get(name,parent)" \
    | while read -r tVal tPar; do
        (( "$tk" != "$tPar" )) || echo "fishy key: $tk x $tPar" >>2;
        valueArr+=( tVal );
      done; 
    tag[$tk]="${(j|:|)valueArr[@]}"
done;
printf 'key|%s \tvalue|%s \n' ${(kv)tag};

for k v in ${(kv)tag}; 
  for _v in ${(s|:|)v}; 
    gcloud resource-manager tags values describe $_v \
      && gcloud resource-manager tags values get-iam-policy $_

# special release
gcloud resource-manager tags keys create release-type \
    --parent="organizations/YOUR_ORGANIZATION_ID" \
    --description="Differentiates public tools from confidential internal releases"

gcloud resource-manager tags values create confidential-preview \
    --parent="YOUR_ORGANIZATION_ID/release-type" \
    --description="For prerelease material restricted to internal staff and close associates"

gcloud resource-manager tags bindings create \
    --parent="//://googleapis.com" \
    --tag-value="YOUR_ORGANIZATION_ID/release-type/confidential-preview"
















gcloud iam policy-bindings list \
  --organization "${organization}"

gcloud iam policy-bindings list \
  --location "${region}" \
  --organization "${primary_domain}"

gcloud iam policy-bindings list \
  --location "${region}"

gcloud iam service-accounts add-iam-policy-binding \
  $service_account
  --project="${project}" \
  --role="roles/iam.serviceAccountUser" \
  --member="${members}"

gcloud iam workload-identity-pools providers update-oidc "${git_oidc}" \
  --workload-identity-pool="${wip_pool}" \
  --location="${wip_location}" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor,attribute.ref=assertion.ref"


############################################################
# TAGS : Key Values Bindings
############################################################
gcloud resource-manager tags keys create "${invokers}Ingress" \
  --parent="organizations/${organization}"

gcloud resource-manager tags keys list \
  --parent="projects/${project_number}"

gcloud resource-manager tags keys tagKeys/281483773609789 \
  --parent="projects/${project_number}"

gcloud resource-manager tags values tagKeys/281483773609789 \
  --parent="projects/${project_number}"

gcloud resource-manager tags \
  values create \
  --parent=tagKeys/281483773609789 \
  --short_name=true

gcloud resource-manager tags keys list \
  --parent="projects/$project_number" 

gcloud resource-manager tags \
  bindings create \
  --parent="//run.googleapis.com/projects/${project_number}/locations/${region}/services/${app_name}" \
  --tag-value=tagValues/281482823460903 \
  --location="${region}"

gcloud run services add-iam-policy-binding "${app_name}" \
  --region="${region}" \
  --member="${invokers}" \
  --role="roles/run.invoker"


############################################################
# Domain Mappings:
############################################################

gcloud run domain-mappings create \
  --service "${app_name}"

gcloud beta run domain-mappings describe \
  --domain $primary_domain \
  --region "${region}"

gcloud beta run domain-mappings describe \
  --domain $secondary_domain  \ 
  --region "${region}"

gcloud run domain-mappings describe \
  --domain "${secondary_domain}" \
  --region "${region}"

gcloud run domain-mappings describe \
  --domain "${secondary_domain}"

gcloud config set run/region "${region}"

gcloud beta run domain-mappings describe \
  --domain "${secondary_domain}"


gcloud auth login --update-adc
gcloud init
gcloud auth application-default print-access-token
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/drive.readonly

################
### PICKER API
###############
gcloud services enable picker.googleapis.com
gcloud services api-keys create \
    --key-id="band-picker-key" \
    --display-name="Band MVP Picker Key" \
    --api-target=service=picker.googleapis.com
gcloud services api-keys update band-picker-key \
    --location=global \
    --allowed-referrers="https://*.yourbandapp.com/*","https://localhost:8080/*"
gcloud services api-keys describe band-picker-key --location=global
# {
#   "displayName": "Band MVP Picker Key",
#   "restrictions": {
#     "apiTargets": [
#       {
#         "service": "picker.googleapis.com"
#       }
#     ],
#     "browserKeyRestrictions": {
#       "allowedReferrers": [
#         "https://*.yourbandapp.com/*",
#         "https://localhost:8080/*"
#       ]
#     }
#   }
# }
# 
#
gcloud pubsub topics create drive-changes-topic#
gcloud pubsub topics add-iam-policy-binding drive-changes-topic \
    --member="serviceAccount:drive-api-event-push@system.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
# ### Step 3: Create the Drive Subscription Target
# Now, configure a subscription rule instructing the Workspace Events system to watch your folder or Shared Drive. 
# 
# You can execute this via code (using the Google Workspace Events SDK client) or by passing a payload file to create the asset definition. The structured request targets your targeted Shared Drive or structural parent directory:
# 
# ```json
# {
#   "targetResource": "//drive.googleapis.com/files/YOUR_SHARED_DRIVE_OR_FOLDER_ID",
#   "eventTypes": [
#     "google.workspace.drive.file.v1.updated",
#     "google.workspace.drive.file.v1.created",
#     "google.workspace.drive.file.v1.deleted"
#   ],
#   "notificationChannel": {
#     "pubsubTopic": "projects/YOUR_PROJECT_ID/topics/drive-changes-topic"
#   }
# }
#
#
# 1. Ensure the GCS Background Service account can write to your project transport
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
GCS_SA="service-${PROJECT_NUMBER}@gs-project-accounts.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:${GCS_SA}" \
    --role="roles/pubsub.publisher"

# 2. Create the Eventarc Trigger for your MP3 bucket
gcloud eventarc triggers create track-upload-trigger \
    --location="us-central1" \
    --destination-run-service="your-ingestion-service" \
    --destination-run-region="us-central1" \
    --event-filters="type=google.cloud.storage.object.v1.finalized" \
    --event-filters="bucket=your-band-mp3s-bucket" \
    --service-account="your-eventarc-invoker-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"#
