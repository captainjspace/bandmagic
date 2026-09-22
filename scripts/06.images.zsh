#!/usr/bin/env zsh

typeset -a SIZES=( "256x256" "32x32" "16x16" )
typeset infile="rollingblackoutlogo-fs-png.png"
typeset magick="$(whence magick)"
typeset target_dir="${PWD:h}/public"
echo "${(%):-%N}"

resize_images() {
  local margs=();
  for s in ${(@)SIZES}; do
    local outfile="$target_dir/${infile:r}.$s.${infile:e}";
    local iconfile="${outfile:r}.ico"
    margs=( "${target_dir}/${infile}" "-resize" "$s\!" "$outfile" );

    if $magick "${(@)margs}"; then
    
      if pnpx png-to-ico "$outfile" > "$iconfile"; then
         echo "Success"
       else
         echo "png-to-ico error" && exit 1;
      fi
    else
      echo "ImageMagick error" && exit 1;
    fi;

  done;
}

main() {
 resize_images

}

main "$@"
