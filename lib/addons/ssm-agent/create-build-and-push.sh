#!/usr/bin/env sh

# Update index.ts with the name of the image repository
REPO=$1

if [ -z $REPO ]; then
  echo "Usage: ./create-build-and-push.sh <public ecr reponame>"
  exit 1
fi

URI=$(aws ecr-public describe-repositories --region us-east-1 --repository-names $REPO 2>/dev/null | jq -r '.repositories[0].repositoryUri')

if [ -z $URI ]; then
  echo "No Public Repository with the provided repository name $REPO, creating one..."
  URI=$(aws ecr-public create-repository --repository-name $REPO --region us-east-1 | jq -r '.repository.repositoryUri')
fi

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

echo "docker build -t $URI ."
docker build -t $URI .

echo "docker push $URI"
docker push $URI