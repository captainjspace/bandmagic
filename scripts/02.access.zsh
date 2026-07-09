#!/usr/bin/env zsh
typeset DEBUG=${DEBUG:-0};
setopt localoptions localtraps
setopt errexit #nounset pipefail
unsetopt noclobber
typeset active_basedir=${$(realpath  ${(%):-%N}):h};
path=( . $active_basedir $PWD $path )
############################################################
t() {monotonic|awk '{print $3}'};

############################################################
mactemp_scr="aW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7CmltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnOwppbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdub2RlOm9zJzsKaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7Cgphc3luYyBmdW5jdGlvbiBjcmVhdGVUZW1wRmlsZShjb250ZW50ID0gJycpIHsKICAvLyAxLiBHZXQgdGhlIE9TLXNwZWNpZmljIHRlbXBvcmFyeSBmb2xkZXIgcGF0aAogIGNvbnN0IHRlbXBEaXIgPSB0bXBkaXIoKTsgCiAgCiAgLy8gMi4gR2VuZXJhdGUgYSBzZWN1cmUsIHVuaXF1ZSBmaWxlbmFtZSAoc2ltaWxhciB0byBta3RlbXAgWFhYWFhYKQogIGNvbnN0IHVuaXF1ZU5hbWUgPSBgdG1wLSR7cmFuZG9tQnl0ZXMoNikudG9TdHJpbmcoJ2hleCcpfS5sb2dgOwogIGNvbnN0IGZ1bGxQYXRoID0gam9pbih0ZW1wRGlyLCB1bmlxdWVOYW1lKTsKCiAgLy8gMy4gV3JpdGUgdGhlIGZpbGUgdG8gZGlzawogIGF3YWl0IHdyaXRlRmlsZShmdWxsUGF0aCwgY29udGVudCwgJ3V0ZjgnKTsKICAKICByZXR1cm4gZnVsbFBhdGg7Cn0KCi8vIFVzYWdlCmNvbnN0IG15VGVtcEZpbGUgPSBhd2FpdCBjcmVhdGVUZW1wRmlsZSgnJyk7CmNvbnNvbGUubG9nKGAke215VGVtcEZpbGV9YCk7Cgo=";
mactemp(){ echo $mactemp_scr | base64 -d | node }
############################################################

# SCRIPT TO PREPARE INFRA FOR band-magic
typeset -g LOG_OUT="$(mactemp)"
typeset -g LOG_ERR="$(mactemp)"

exec 2> >(tee -a "$LOG_ERR" >&2) \
     1> >(tee -a "$LOG_OUT"  >&1);
( tail -f "$LOG_ERR" "$LOG_OUT" | nc -U /tmp/deploy.sock ) &
echo "BaseDir: $active_basedir";
echo "Logout:  $LOG_OUT";
echo "Logerr:  $LOG_ERR";
date; monotonic;
############################################################
# vars[band-magic]
source 01.vars.zsh

typeset -gxr FMT_DEFAULT_KV='%30s:%-50s';
typeset -A sec_call_stack=()

############################################################
### FLAGS
############################################################
# ── Binary flags ──────────────────────────────────────────────────────────────
typeset -gxi FLAGS=0
typeset -gx flag_state_file=

init_flags() {

  typeset -gxa FLAGSET
  typeset -gxA flagtable
  typeset -gxA flagsort
  typeset -i flag=0

  FLAGSET=(
    # environment
    CONFIG_PROJECT CONFIG_REGION GCP_PROJECT_VARS_SYNCD
    # accounts
    SERVICE_ACCOUNT_EXISTS DRIVE_SERVICE_EXISTS SA_CONFIG_VALID
    # resources
    ARTIFACT_REPO_CREATED DOCKER_FORMAT REPO_LOCATION_CORRECT
    SECRETS_CREATED
    GIT_FEDERATION
    # access policy
    FIRESTORE_ACCESS CLOUD_STORAGE_ACCESS DRIVE_SERVICE_TOKENS
    # federation
    WLIP_HAS_REPO_WRITE WLIP_HAS_PROJECT_DEV
    # workspace
    # err
    ERR_SERVICE_ACCOUNT_NOT_SET
    ERR_INVALID_ACCOUNT
    ERR_DRIVE_SERVICE_ACCOUNT_CONFIG_MISSING
    ERR_PRIMARY_SERVICE_ACCOUNT_CONFIG_MISSING

    # api fault
    ERR_GCLOUD_API_FAULT
  )

  for i in {1..$#FLAGSET[@]}; do
    (( flag = 1 << (i - 1) ))
    typeset -gxir ${FLAGSET[$i]}=$flag
    flagtable[${FLAGSET[$i]}]=$flag
    flagsort[$i]=${FLAGSET[$i]}
  done
}
init_flags

# ── Flag utilities ────────────────────────────────────────────────────────────

show_flags() {
  local rule=${1:-0} table_template="%48s | %10s | %-26s | %s\n";
  printf  $table_template "FLAG" "HEX" "BIN" "SET"
  printf '%s\n' "$(printf '─%.0s' {1..120})"
  for i in "${(@kon)flagsort}"; do
    local flag="$flagsort[$i]"
    local -i value=$flagtable[$flag]
    local is_set=$( ((FLAGS & value)) && printf 'TRUE' || printf 'FALSE')
    printf $table_template $flag $value $(([##2]value)) $is_set;
  done
  echo
}
show_flags;
# Returns 0 (true) if all named flags are set in FLAGS
check_mask() {
  local mask=0
  for f in "$@"; do (( mask |= ${flagtable[$f]:-0} )); done
  (( (FLAGS & mask) == mask ))
}
############################################################
#  THE MASTER TRAP
# Clean up all pipeline loggers when this shell thread stops
############################################################
cleanup() {

  show_flags
  echo "$(([##2]FLAGS))  $FLAGS  $(([##16]FLAGS))"
  ps -o pid= -o comm= -t $(tty) | perl -lane '{ ( kill(9, $F[0]) and waitpid($F[0],0) ) if $F[1] =~ /tee|tail|nc/}';
  rm -f /tmp/deploy.sock
}
trap cleanup ERR EXIT

#
############################################################
# MASTER API FUNCTION
############################################################
call_gcloud() {
  set -x
  local _params=("$@");
  local response="";
  local return_code;

  {
    cmd=gcloud "$_params[@]";
    command "$cmd"
    # TRY: Attempt call
    return_code="$?";
    echo "$response";
    return $return_code;
  } always {
    # CATCH: Handle error state cleanly
    if [[ $TRY_BLOCK_ERROR -ne 0 ]]; then
      (( TRY_BLOCK_ERROR = 0 )) # Suppress exception bubbling
      (( FLAGS|=ERR_GCLOUD_API_FAULT ));
      {
        echo "###########################"
        echo "ERROR: with gcloud command"
        echo "COMMAND: ${call_gcloud_params[*]}";
        echo "RESPONSE: $response ";
        echo "CODE: $return_code";
        echo "###########################"
      } > 2;
    return -1                 # Return failure exit code
    fi 
  } 
}


gcloud() {
    # Run the gcloud command with all arguments passed to it
    command gcloud "$@"
}


# 2. Trap for errors (ZERR triggers when any command returns a non-zero status)
TRAPZERR() {
    local exit_code=$?
    # $_ contains the command that just failed
    echo "🚨 Error! Command '$1' failed with exit code $exit_code"
    
    # Add your custom error handling/cleanup logic here
    # e.g., send notification, clean up temporary files, log, etc.
}

set +x
# Return value safely via stdout
echo "GCLOUD COMMAND ERROR:"
tail -n 20 $LOG_ERR;
return 0
}
#############################################################
#call_gcloud "iam service-accounts describe $service_account \
#    --format=\"value(uniqueId,projectId,name,displayName,email)\" \
#    --project $project"
#exit;
#############################################################
# BEGIN MAIN FUNCTION LISTING
############################################################
#  Cloud Project Env
#  pure code organization no inputs allowed
############################################################
set_gcp_cloud_project_vars() {

# TAG: CONFIG
setopt localoptions shortloops;
local -a msg=()
sp_return(){print -l ${(v)msg}; return 0}
# Synchronize all variants
typeset -a project_vars = (
  CLOUDSDK_CORE_PROJECT CLOUDSDK_PROJECT GOOGLE_CLOUD_PROJECT
  GCLOUD_PROJECT PROJECT_ID GOOGLE_PROJECT GOOGLE_CLOUD_QUOTA_PROJECT
)
for var in "${project_vars[@]}"; do
  local _var="${(P)var}";
  (( ${+_var} )) || {
    msg+=( "--> adding $var ") \
    && typeset -gx $var="$project"
  };

(( DEBUG )) && echo "project:$project:var:$var:pvar:${(P)var}:_var:$_var";

(( "${(P)var}" = "$project" )) \
  && ((FLAGS|=GCP_PROJECT_VARS_SYNCD)) \
  || {
    ((FLAGS^=GCP_PROJECT_VARS_SYNCD)) \
    && echo "❗ ❌$vars maybe readonly ${(P)vars}" \
    && echo "unset the -r flag and try again." \
    && sp_return && return -1;
  };
done;
echo "✅ GCP Environment Variables synchronized";
for var in "${project_vars[@]}";
  printf '%s=%s\n' "$var" "${(P)vars}";
  sp_return && return 0;
}
############################################################
set_enviroment() {

### vars:
local _project _region

### unified project
gcloud config get project 2>/dev/null | read _project;

(( "$project" = "$_project" )) && (( FLAGS|=CONFIG_PROJECT)) \
  || {  gcloud config set project $project && (( FLAGS|=CONFIG_PROJECT )) }

set gcp_cloud_project_vars;

gcloud config get compute/region 2>/dev/null | read _region;

### base;lined region
(( "$region" = "$_region" )) \
  && (( FLAGS|=CONFIG_REGION )) \
  || { gcloud config set compute/region $region \
  && (( FLAGS|=CONFIG_REGION ))
  }

typeset -gx gcpcfg;
gcloud config configurations list \
  --filter="is_active=true" \
  --format="value(name)" | read gcpcfg

gcloud config configurations describe $gcpcfg;
gcloud config list --format yaml
}
############################################################
# END ENVIROMENT AND CONFIG Variables
############################################################

############################################################
# ACCOUNTS
############################################################
# placeholder for extensibility
typeset -gAx all_service_accounts;
############################################################
typeset -gA account=();
### primary application service accountSK
check_service_account() {
  local valid=( $service_account $drive_service_account );
    local _account="$1";

    # get and flags
    (( ${+account} ))           || (( FLAGS|=ERR_SERVICE_ACCOUNT_NOT_SET ));
    (( ${valid[(I)$account]} )) || (( FLAGS|=ERR_INVALID_ACCOUNT ));
    (( $+service_account ))     || (( FLAGS|=ERR_PRIMARY_SERVICE_ACCOUNT_CONFIG_MISSING ));
    (( $+drive_service_account ))     \
      || (( FLAGS|=ERR_DRIVE_SERVICE_ACCOUNT_CONFIG_MISSING ));

      ####ANY ERROR ABOVE
      (( MASK_ANY_SA_ERROR=ERR_SERVICE_ACCOUNT_NOT_SET
      |ERR_INVALID_ACCOUNT
      |ERR_DRIVE_SERVICE_ACCOUNT_CONFIG_MISSING
      |ERR_PRIMARY_SERVICE_ACCOUNT_CONFIG_MISSING ))

      (( FLAGS & MASK_ANY_SA_ERROR )) && return -1 \
        || (( FLAGS|=SA_CONFIG_VALID ))  #GOAL

        # CONFIG IS VALID
        call_gcloud "iam service-accounts describe $service_account \
          --format=\"value(uniqueId,projectId,name,displayName,email)\" \
          --project=$project" | read -r -d'\t' _uid _pid _name _display _email;

        account=(
          [uniqueId] "$_uid"
          [projectId] "$_pid"
          [name] "$_name"
          [displayName] "$_display"
          [email] "$_email"
          );

          (( "$service_account" = "${account[email]}" )) \
            && ((FLAGS|=SERVICE_ACCOUNT_EXISTS)) # GOAL
          printf "$FMT_DEFAULT_KV" "${(kv)account}"
}

setup_service_account() {

  local create_status record record_status;
  typeset -A account=( $(check_service_account) );
    ((FLAGS & SERVICE_ACCOUNT_EXISTS)) && return 0;

    () {
      # Create service account
      call_gcloud "iam service-accounts create $app_name \
        --display-name=$Proper_Case \
        --project=$project";

      create_status=$?;

      (( create_status == 0 )) \
        && {
          (( FLAGS|=SERVICE_ACCOUNT_EXISTS ));
                echo "new account $service_account created";
                return 0;
              } || echo "Warn: no create check local record"
    }

    # one more check for latency
    check_service account;
    (( FLAGS & SERVICE_ACCOUNT_EXISTS )) && return 0 \
      || { echo " service account failed;" return -1;  }
    # there is no point in proceding if we cant get
}

### now we grant that same service account access to firesorer and storage
setup_sa_resource_roles() {

# $project, $service_account, role, condition
# rollingblackoutapp, band-magic, datastore.user, None
# rollingblackoutstorage, band-magic, storage.objectViewer, None
# band-magic, serviceAccountUser, WIPprincipal, None

local firestatus firestore storage storagestatus servicestatus service

setopt localtraps
trap '
echo "Service Account Grants";
printf "Firestore:%s\n%s\n"    $firestatus $firestore;
printf "Storage:%s\n%s\n"     $storagestatus $storage;
printf "ServiceUser:%s\n%s\n" $servicestatus $service;
' ERR EXIT

run_policy_checks
((FLAGS|=FIRESTORE_ACCESS))

(( FLAGS & FIRESTORE_ACCESS )) || {
  # Firestore read/write (releases, notes, catalog)
  call_gcloud "projects add-iam-policy-binding $project \
    --member=\"serviceAccount:${service_account}\" \
    --role=\"roles/datastore.user\" \
    --condition=None" | read -r -d '' firestore;
  firestatus=$?;
  (( firestatus = 0 )) && (( FLAGS|=FIRESTORE_ACCESS ));
}

((FLAGS & STORAGE_ACCCESS )) || {
  # GCS read-only (audio streaming, catalog sync)
  cal_gcloud "projects add-iam-policy-binding ${resource_projects[storage]} \
    --member=\"serviceAccount:${service_account}\" \
    --role=\"roles/storage.objectViewer\" \
    --condition=None" | read -r -d'' storage;
  storagestatus=$?;
  (( storagestatus = 0 )) && (( FLAGS|=STORAGE_ACCESS ));
}


}
# Review this looks wrong liek act As service account for WIP
# update this to effectively user the services account
(( FLAGS & DRIVE_SERVICE_TOKENS )) || {
  call_gcloud "iam service-accounts add-iam-policy-binding ${drive_service_account:-""} \
  --project=$project \
  --role=\"roles/iam.serviceAccountTokenCreator\" \
  --member=\"serviceAccount:$serviceAccount\" \
  --condition=None" | read  -r -d'' service;
servicestatus=$?;
(( servicestatus = 0 )) && (( FLAGS|=DRIVE_SERVICE_TOKENS ));
}
return 0;
}

############################################################
#  artifact repository
############################################################
# DevOps Domain - the interaction here is automated
#
# does repo exist
typeset artifacts_tmp="$(mktemp)"
typeset -gx gar="gcloud artifacts repositories";  #shorten code
monotonic 2>/dev/null
show_artifacts() {
  local -a artrepos
  setopt shortloops
  typeset -A kvrepo
  #redirect table to stderr
  gcloud artifacts repositories list \
    --format="[box]table(name,format,mode)" > "${artifacts_tmp}"
  gcloud artifacts repositories list \
    --format="get(name)" 2>/dev/null | read -r -d ' ' artrepos
  for r in ${(f)artrepos}; kvrepo[${n:t}]=$n
    declare -pA kvrepo
}

create_artifact_repo() {
  typeset -A retvals
  # pull in kvrepo name/pathnn
  eval "$(show_artifacts)";
  (( $+kvrepo > 0 )) && echo "no existing repos" || cat $artifacts_tmp;
  local repositories=( $artifact_repo )
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

############################################################
#  Note: the pool was set up in March/April
############################################################
#
# members - WIF_PROVIDER
#
# no sa here
# enable the pool to write to the repository
allow_write(){
  gcloud artifacts repositories \
    add-iam-binding "$artifact_repo" \
    --project="$project" \
    --location="$region" \
    --role="roles/artifactregistry.writer" \
    --member="$(members)"
}

### May need to developer the right to pull and test
### Add runner/developer to authorized
allow_run() {
  gcloud projects add-iam-policy-binding "$project" \
    --role="roles/run.developer" \
    --member="$(members)";
}

#### Visualize what's done
list_artifact_bindings(){
  gcloud artifacts repositories get-iam-policy $app_name \
    --location="$region" \
    --flatten="bindings[].members" \
    --format="[box]table(bindings.role:label=ROLE, \
    bindings.members.split('/').slice(-2:).join('/'):label=REPO_PRINCIPAL)"
}


###############################################
# ACCESS CONTROLS
#
# docker artifacts
config_docker() {
  # probably done
  call_gcloud "auth configure-docker ${region}-docker.pkg.dev"
}


cloud_run_lockdown() {
  #

  # private application
  # block the public
  call_gcloud "run services update $app_name \
    --region=$region \
    --ingress=internal-and-cloud-load-balancing"

    # tekk cloud we have it handled
    call_gcloud "run services update $app_name \
      --region=$region \
      --no-invoker-iam-check"

}

enable_IAP() {

  call_gcloud "iap web enable --resource-type=backend-services \
    --oauth2-client-id= --oauth2-client-secret=SECRET \
    --service=$app_name --region=$region"
  #"Assign them the role of IAP-secured Web App User (roles/iap.httpsResourceAccessor).
}
############################################################
#
# Secrets
#
############################################################
define_secrets(){
  echo -n "my super secret data" | gcloud secrets create my-secret \
    --replication-policy="replication-policy" \
    --data-file=-
  gcloud secrets versions access latest --secret="my-secret"
}


############################################################
#
#ordered function stack
typeset -gxa call_stack=(
  set_enviroment
  setup_service_account
  setup_sa_resource_roles
  show_artifacts
  create_artifact_repo
  allow_write
  allow_run
  list_artifact_bindings
)
main() {
  #  setopt localtraps
  # debug
  trap 'echo "==execute==> $ZSH_DEBUG_CMD (Line: $LINENO)"' DEBUG
  # end debug
  printf '%s\n' ${(v)call_stack};
  for fun in ${(v)call_stack}; do;
    local funlog="$(mktemp)"
    echo $fun;
    $fun;
    #>> $funlog
    local capVal=$?
    #    $sec_call_stack[$fun]="$funlog"
    echo "ExitCode: $capVal";
    #cat $funlog
    echo "FLAGS: = $FLAGS"
    (($capVal != 0 )) && return;
  done;
}
main "$@";
exit
