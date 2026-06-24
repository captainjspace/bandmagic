#!/usr/bin/env zsh

############################################################
# common vars - propate to source vars
# where possible source from natural environment and overide
# investert ${my:-${nextval:-${next:-${andson}}}} || error
############################################################
#
google_cloud_project="rollingblackoutapp"
project_number="901961412597"
project_location="us-central1"; # region
git_acct="captainjspace"
git_repo="band-magic"
repo="band-magic";
wif_location="global";

############################################################
#
# builds universal slug
join(){
  typeset -a elements=(
    "principalset://iam.googleapis.com/projects"
    "${project_number}"
    "locations"
    "${wif_location}"
    "workloadidentitypools"
    "${wip_pool}"
    "attribute.repository"
    "${git_acct}"
    "${git_repo}"
  )
  echo "${(j:/:)elements}"
}

############################################################
# create the repo 
gcloud artifacts repositories \
  add-iam-policy-binding ${repo} \
  --project="$google_cloud_project" \
  --location="$location" \
  --role="roles/artifactregistry.writer" \
  --member="$(join)"

############################################################
# display the work
gcloud artifacts repositories list
gcloud artifacts repositories get-iam-policy "$git_repo" \
  --location "$project_location"
#
