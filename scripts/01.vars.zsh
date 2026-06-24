#!/usr/bin/env zsh
############################################################
# on the static sides
typeset -gxa varset=();
### every variable should in here
varset=(
  app_name artifact_repo git_acct git_oidc git_repo
  google_folder google_org invokers project project_number
  Proper_Case region resource_projects service_account 
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
typeset -gx invokers="allAuthorizedUsers"
typeset -gx service_account="${app_name}@${project}.iam.gserviceaccount.com"
typeset -gx wip_identifier="";  #lookup later
typeset -gx Proper_Case=${(C)${app_name/-/ }}
# principals forward
members() {
  typeset -gxa principal_set_elements=(
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
  for var in ${varset[@]}; do
    printf '%30s ========  %-50s\n' "$var" "${(P)var}" 
  done;
}
members >/dev/null;
display_vars;
############################################################
