#!/bin/bash
set -aue
PEM_FILE=~/.ssh/github_rsa
URL_TEMPLATE="git@github" # all of GitHub

echo 'Generating secret file using' $PEM_FILE 
sshPrivateKey=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}'  $PEM_FILE)

echo ""
echo "{"
echo "    \"sshPrivateKey\": \"${sshPrivateKey}\","
echo "    \"url\": \"${URL_TEMPLATE}\""
echo "}"




