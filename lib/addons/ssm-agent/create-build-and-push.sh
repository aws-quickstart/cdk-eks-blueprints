#!/usr/bin/env sh

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -r|--repo)
      REPO="$2"
      shift # past argument
      shift # past value
      ;;
    -t|--ssm-version-tag)
      VERSION_TAG="$2"
      shift # past argument
      shift # past value
      ;;
    -h| --help)
      echo "Usage: ./create-build-and-push.sh --repo <public_ecr_repo_name> --ssm-version-tag <ssm_agent_version>"
      echo "E.g: ./create-build-and-push.sh --repo eks-blueprints-test/addon-ssm-agent --ssm-version-tag 3.0.1390.0"
      exit 0
      ;;
    *)    # unknown option
      POSITIONAL+=("$1") # save it in an array for later
      shift # past argument
      ;;
  esac
done

[ -z $VERSION_TAG ] && VERSION_TAG="latest"

# restore positional parameters
set -- "${POSITIONAL[@]}"

URI=$(aws ecr-public describe-repositories --region us-east-1 --repository-names $REPO 2>/dev/null | jq -r '.repositories[0].repositoryUri')

if [ -z $URI ]; then
  echo "No Public Repository with the provided repository name $REPO, creating one..."
  URI=$(aws ecr-public create-repository --repository-name $REPO --region us-east-1 | jq -r '.repository.repositoryUri')
fi

aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

echo "docker build -t $URI:$VERSION_TAG ."
docker build -t $URI:$VERSION_TAG .
docker tag $URI:$VERSION_TAG $URI:latest

echo "docker push $URI:$VERSION_TAG"
docker push $URI:$VERSION_TAG
docker push $URI:latest