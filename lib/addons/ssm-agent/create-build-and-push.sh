#!/usr/bin/env sh

REPO=$1

if [ -z $REPO ]; then
  echo "Usage: ./create-build-and-push.sh <public ecr reponame>"
  exit 1
fi

URI=$(aws ecr-public describe-repositories --region us-east-1 --repository-names $REPO 2>/dev/null | jq -r '.repositories[0].repositoryUri')
echo $URI

if [ -z $URI ]; then
  aws ecr-public create-repository \
    --repository-name $REPO --region us-east-1
  URI=$(aws ecr-public describe-repositories --region us-east-1 --repository-names $REPO 2>/dev/null | jq -r '.repositories[0].repositoryUri')
fi

aws ecr-public get-login-password \
  --region us-east-1 | \
  docker login --username AWS --password-stdin public.ecr.aws

echo "docker build -t $URI/ssm-installer ."
docker build -t $URI .

echo "docker push $URI/ssm-installer"
docker push $URI