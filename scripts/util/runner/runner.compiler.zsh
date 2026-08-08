#!/usr/bin/env zsh
############################################################
# obfuscator of shellvars #
# joshgcp@rollingblackoutband.band
############################################################
typeset -g dir
stat -f %R "${(%):-%N}" | read -r dir
dir="${dir:h}" && pushd $dir
() {
  
  unsetopt noclobber
  local varsrc="./.runner.vars";               # actual vars 
  local intersrc="runner.strings";          # xor random hex
  local headersrc="runner.h" ;        # generated hex header
  local src="runner.c";                # runtime decoder src
  local binary="../runner-decoder";   # binary to be sourced
  # seed
  [[ ! -f "$varsrc" ]] && ../../../runner >| ./runner.vars
  # 0. extract vars to someplace not git
  # 1. Pick hex key random
  # 2. Xor chars
  # 3. make c .h file
  # 4. inject hex key and compile
  # 5. remove strings 
  # 6. source <(runner-decoder) in shell

  KEY=0x$(od -An -N1 -tx1 /dev/urandom | tr -d ' ') \
    && perl -s -ne '{s/./$&^chr(hex($k))/seg and print} END {print pack("C", 0)}' -- -k=$KEY $varsrc > $intersrc \
    && xxd -i -t $intersrc  > $headersrc  \
    && clang -DDECRYPT_KEY=$KEY $src -o $binary \
    && rm $intersrc;

  gpg -se -r bandmagic $binary
  cp $binary ../../../$binary

  setopt noclobber
  $binary  
}
popd;
