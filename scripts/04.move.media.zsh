#!/usr/bin/env zsh
# move utilities
# # finish#
GS="gcloud storage"

typeset -A command_set=(
  move "mv"
  list "ls"
  buckets "buckets"
)

typeset -A buckets=(
  describe "describe"
)

typeset formats=(
  hierarchical_namespace "value(hierarchical_namespace.enabled)" 
)

typeset -A url_builder=(
  prefix "gs://"
  bucket "rollingblackoutband"
  media_root="2026"
)

mm(){
  local from="$1" to="$2"
  #echo $MOVER "$from" "$to"
}


#gcloud storage mv \
#  gs://"rollingblackoutband/2026/2026-09-15-The Cunning Linguist.mp3" \
#  gs://"rollingblackoutband/2026/Connie Linguini/"
#
#  CLOUDSDK_METRICS_ENVIRONMENT="gcs-skills gcs-skills/1.0 (skill:google-cloud-storage-basics)" \
#gcloud storage folders rename gs://<BUCKET_NAME>/old-folder/ gs://<BUCKET_NAME>/new-folder/
#CLOUDSDK_METRICS_ENVIRONMENT="gcs-skills gcs-skills/1.0 (skill:google-cloud-storage-basics)" \
gcloud storage buckets describe gs://<BUCKET_NAME> --format="value(hierarchical_namespace.enabled)"

