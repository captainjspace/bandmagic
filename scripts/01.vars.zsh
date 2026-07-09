#!/usr/bin/env zsh
############################################################
# on the static sides effectively tf.vars
# this is the declarative set of data

typeset active_basedir=${$(realpath  ${(%):-%N}):h};
## declaration of the declarative 
typeset -gxa varset=();
varset=(
  app_name artifact_repo git_acct git_oidc git_repo
  google_folder google_org invokers project project_number
  Proper_Case region resource_projects service_account drive_service_account
  wip_identifier wip_location wip_pool principal_set_elements
  primary_domain secondary_domain
);

## organization and domain
typeset -gx google_org="rollingblackoutband.com"
typeset -gx primary_domain="$google_org"
typeset -gx secondary_domain="rollingblackout.band" 
typeset -gx google_folder="rollingblackoutcloud"

## projects
typeset -gxA resource_projects=( 
  storage "rollingblackoutstorage" #mp3
  app "rollingblackoutapp"         #firestore
);
typeset -gx project="${resource_projects[app]}";
typeset -gx project_number;

# request # from name
gcloud projects describe rollingblackoutapp --format "value(projectNumber)" \
  | read project_number;

# region locations 
typeset -gx region="us-central1"

# workload identity federation
typeset -gx wip_location="global"
typeset -gx wip_pool="githubpool"
typeset -gx wip_identifier="";  #lookup later

# git repo
typeset -gx git_oidc="github"
typeset -gx git_acct="captainjspace"
typeset -gx git_repo="band-magic"

# app specific - matching repo to proiect
typeset -gx app_name="band-magic"
typeset -gx artifact_repo="band-magic"

## cloud run invokers not correct
typeset -gx invokers="allAuthorizedUsers"

## service account and principals
typeset -gx service_account="${app_name}@${project}.iam.gserviceaccount.com"
typeset -gx Proper_Case=${(C)${app_name/-/ }}
typeset -gx drive_service_account="";

## assemble path of git hub workpool for deployments
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

  # set wip_identifier
  wip_identifier="${(j:/:)principal_set_elements}"
}

# use declare of declares to display
display_vars() { 
  for var in ${varset[@]}; do
    local val="${(P)var}"; asc_op='\e[0m'; asc_cl='\e[0m';
     (( ${+val} )) && asc_op='\e[31m'; 
    printf "${asc_op} %30s ========  %-50s ${asc_cl} \n" "$var" "${(P)var}" 
  done;
}

## main show the directory, build principal path, show all vars;
main(){
  echo $active_basedir;
  members >/dev/null;
  display_vars;
}
main "$@";
############################################################
