# CodeBuild CI

This example shows how to enable a CodeBuild based Continuous Integration process for the Blueprints blueprint. The CodeBuild project is provisioned using a CDK application.

The [buildspec.yml](../../ci/buildspec.yml) provided deploys the sample blueprint stacks provided in [examples](../../bin/main.ts). The buildspec can be used directly if you wish to setup the CodeBuild project manually through the console or via the CLI.

Optionally, you can also provide an S3 bucket location for a `cdk.context.json` that contains key-values for any context you want to provide to your application such as route 53 domain, domain account, subzone, IAM users, etc.

## Deploy CodeBuild Project

First, clone this project.

```sh
git clone https://github.com/aws-quickstart/cdk-eks-blueprints.git

cd cdk-eks-blueprints
```

Install CDK (please review and install any missing [pre-requisites](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) for your environment)

```sh
npm install -g aws-cdk@1.104.0
```

Install the dependencies for this project.

```sh
npm install
```

Bootstrap CDK into the target AWS account and region.

```sh
env CDK_NEW_BOOTSTRAP=1  cdk bootstrap \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
aws://<ACCOUNT_ID>/<AWS_REGION>
```

Connect GitHub organization to CodeBuild (as described [here](https://docs.aws.amazon.com/codebuild/latest/userguide/access-tokens.html)).

```sh
export GITHUB_TOKEN=<personal_access_token>

aws codebuild import-source-credentials \
  --server-type GITHUB \
  --auth-type PERSONAL_ACCESS_TOKEN \
  --token $GITHUB_TOKEN
```

Optionally, upload a cdk.context.json file into an S3 bucket which can be accessed by the CodeBuild project.

```sh
aws s3 cp cdk.context.json \
  s3://<s3bucket>/cdk.context.json
```
Deploy the CodeBuild Project. Use the `--parameters GitHubOwner=<value>` to override the value for `owner` used in the CodeBuild project. If you do not specify the input parameter we will try to use `aws-quickstart` by default.

```sh
cdk deploy -a "npx ts-node ci/index.ts" \
  --parameters GitHubOwner=<GitHubOwner> \
  --context eks.default.context-location=s3://<s3bucket>/cdk.context.json"
```

After the deployment is completed the CodeBuild project will be configured to build and deploy the blueprint stack on every pull-request merge to the `main` branch.

**Note**: *Update build badge url the top level [README](../README.md). The badge url can be obtained by running the following AWS cli command.*

```sh
aws codebuild batch-get-projects \
  --names QuickstartSspAmazonEksBuild | \
  jq -r '.projects[0].badge.badgeRequestUrl'
```
