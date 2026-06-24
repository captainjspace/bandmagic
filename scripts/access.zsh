#!/usr/bin/env zsh
set -euo pipefail
############################################################
# on the static sides
typeset -gxa varset;
### every variable should in here
varset=(
  app_name artifact_repo git_acct git_oidc git_repo
  google_folder google_org identity invokers project project_number
  Proper_Case region repo resource_projects service_account specific
  wip_identifier wip_location wip_pool principal_set_elements
);

typeset -gx google_org="rollingblackoutband.com"
typeset -gx google_folder="rollingblackoutcloud"
typeset -gxA resource_projects=( 
  storage "rollingblackoutstorage" 
  app "rollinigblackoutapp"
);
typeset -gx project="${resource_projects[app]}";
typeset -gx project_number;
gcloud projects describe rollingblackoutapp \
--format "value(projectNumber)"| read project_number;

typeset -gx region="us-central1"
# workload identity federation
typeset -gx wip_location="global"
typeset -gx wip_pool="githubpool"

# git repo
typeset -gx git_oidc="github"
typeset -gx git_acct="captainjspace"

# app specific
typeset -gx app_name="band-magic"
typeset -gx artifact_repo="band-magic"

typeset -gx git_repo="band-magic"
typeset -gx invokers="authorizedUsers"
#typeset -gx service_account="$project_number-compute@developer.iam.googleservice.com";
typeset -gx service_account="${app_name}@${project}.iam.gserviceaccount.com"
typeset -gx wip_identifier="";  #lookup later
typeset -gx Proper_Case=${(C)${app_name/-/ }}
# principals forward
members() {
  typeset -a principal_set_elements=(
    "principalSet://iam.googleapis.com"
    "projects"
    "$project_number"
    "locations"
    "${wip_location}"
    "workloadIdentityPools"
    "${wip_pool}"
    "attribute.repository"
    "$git_acct"
    "$git_repo"
  )
  wip_identifier="${(j:/:)principal_set_elements}"
  echo $wip_identifier;
}
display_vars() { 
  for var in ${varset[@]]}; do
    printf '%30s ========  %-50s\n' "$var" "${(P)var} 
  done;
}

############################################################
source ./01.vars.zsh
#vars[band-magic]
############################################################
###########################################################
############################################################
# SCRIPT TO PREPARE INFRA FOR band-magic
############################################################

typeset -A sec_call_stack=()
############################################################
### Add writer to authorized principals
############################################################

set_enviroment(){
  gcloud config set project $project; 
  typeset -gx CLOUDSDK_CORE_PROJECT="$project"; 
}




### creates the primary application service account
setup_service_account() {
  # Create service account
  gcloud iam service-accounts create "$app_name" \
    --display-name="$Proper_Case" \
    --project="$project"
  local status=$?;
  local record=$(gcloud iam service-accounts describe "$service_account" --format yaml --project "$project");
  printf 'create status: %d\n%s\n' "$status" "$record";
}

### now we grant that same service account access to firesorer and storage
setup_sa_resource_roles() {
  # Firestore read/write (releases, notes, catalog)
  gcloud projects add-iam-policy-binding "${project}" \
    --member="serviceAccount:${service-account}" \
    --role="roles/datastore.user"

  # GCS read-only (audio streaming, catalog sync)
  gcloud projects add-iam-policy-binding "${resource_projects[storage]}" 
    --member="serviceAccount:${service-account}" \
    --role="roles/storage.objectViewer"
}

check_sa() {
 # gcloud iam service

}

sec_call_stack=( set_sa_project_resource_access $sec_call_stack );

#  artifact repository 
# does repo exist
typeset artifacts_tmp="$($mktemp)"
typeset -gx gar="${gar} "

show_artifacts() {
  local -a artrepos
  localoptions
  setopt shortloops
  typeset -A kvrepo
  #redirect table to stderr 
  "${gar}" list --format="[box](name,format,mode)" > "${artifacts_tmp}"
  "${gar}" list --format="get(name)" 2>/dev/null | read -r -d '' artrepos
  for r in ${(f)artrepos}; kvrepo[${n:t}]=$n
  declare -pA kvrepo 
}

create_artifact_repo() {
  typeset -A retvals
  # pull in kvrepo name/path
  eval "$(show_artifacts)";
  (( $+kvrepo > 0 )) && echo "no existing repos" || cat $artifacts_tmp;
  local repositories=( $artifact_repo "$@" )
  # r is repo name
  for r in ( ${(v)repositories} ); do
    #see if the repo exist 
    (( $+kvrepo[$r] > 0 )) \
      && {
           ${gar} create "$r" \
             --repository-format docker \
             --location $region;retvals[$r]=$? 
         } \
      || echo "$r already exists at ${kvrepo[$r]}";
  done;
  printf 'new repo:%s, return code: %s\n' ${(kv)retvals};
}
# no sa here 
# enable the pool to write to the repository
allow_write(){
  ${gar} \
    add-iam-binding "$artifact_repo" \
    --project="$project" \
    --location="$region" \
    --role="roles/artifactregistry.writer" \
    --member="$(members)"
}
### Add runner/developer to authorised
allow_run() {
  gcloud projects add-iam-policy-binding "$project" \
    --role="roles/run.developer" \
    --member="$(members)"
}

list_artifact_bindings(){
  "${gar}" get-iam-policy resume \
    --location=us-central1 \
    --flatten="bindings[].members" \
    --format="[box]table(bindings.role:label=ROLE, \
    bindings.members.split('/').slice(-2:).join('/'):label=REPO_PRINCIPAL)"
}


# update this to effectively user the services account
gcloud iam service-accounts add-iam-policy-binding "${service_account}@${project_id}.iam.gserviceaccount.com: \
  --project="${project}" \
  --role="roles/iam." \
  --member="$(members)"

#fix
gcloud run services add-iam-policy-binding ${app_name} \
  --region="${region}" \
  --member="${invokers}" \
  --role="roles/run.invoker"


gcloud projects add-iam-policy-binding "${project}" \
  --role="roles/run.developer" \
  --member="$(members)"

# updating maaping
gcloud iam workload-identity-pools providers update-oidc "${git_hub}" \
  --workload-identity-pool="${wip_pool}" \
  --location="${wip_location}" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor,attribute.ref=assertion.ref"


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


