#!/usr/bin/env zsh
# docker local
#

main() {
  docker build "${PWD:h}" -t band-magic

  docker run -d -p 8090:8080 \
    --env-file "${PWD:h}/.env.local" \
    -v "$HOME/.config/gcloud/application_default_credentials.json:/tmp/adc.json:ro" \
    -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/adc.json \
    band-magic

}

main

