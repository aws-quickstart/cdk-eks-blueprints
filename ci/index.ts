#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
// Utils
import { valueFromContext } from '../lib/utils/context-utils';

const app = new cdk.App();

export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameters
    const ghOwner = new cdk.CfnParameter(this, 'GitHubOwner', {
      type: "String",
      description: "The GitHub organization you own.",
      default: "aws-quickstart"
    });

    // Context
    const contextLocation = valueFromContext(this, 'eks.default.context-location', '');

    // Setup the CodeBuild project for our GitHub repo
    const source = codebuild.Source.gitHub({
      owner: ghOwner.valueAsString,
      repo: 'cdk-eks-blueprints',
      reportBuildStatus: true,
      webhook: true,
      branchOrRef: "main",
      webhookFilters: [
        codebuild.FilterGroup
          .inEventOf(codebuild.EventAction.PULL_REQUEST_MERGED)
      ],
    });

    const project = new codebuild.Project(this, 'QuickstartSspAmazonEksBuild', {
      source,
      projectName: 'QuickstartSspAmazonEksBuild', // to uniquely identify our project
      badge: true, // copy the URL from CLI and update the top level README.md
      buildSpec: codebuild.BuildSpec.fromSourceFilename('ci/buildspec.yml'),
      concurrentBuildLimit: 1, // so that we don't exceed any account limits
      environmentVariables: {
        CONTEXT_LOCATION: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: contextLocation
        }
      },
      logging: {
        cloudWatch: {
          logGroup: new LogGroup(this, `QuickstartSspAmazonEksBuildLogGroup`),
        }
      },
    });

    const qualifier = valueFromContext(this,
      '@aws-cdk/core:bootstrapQualifier', // TODO: what is the significance of this?
      cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER
    );

    project.addToRolePolicy(new PolicyStatement({
      resources: [
        `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/cdk-${qualifier}-deploy-role-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
        `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/cdk-${qualifier}-file-publishing-role-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`
        ],
      actions: ['sts:AssumeRole']
    }));

    project.addToRolePolicy(new PolicyStatement({
      resources: [`*`],
      actions: ['ec2:DescribeAvailabilityZones']
    }));

    if (contextLocation.includes('s3://')) {
      const s3Url = new URL(contextLocation);
      const bucket = Bucket.fromBucketName(this, 'ContextBucket', s3Url.host);
      bucket.grantRead(project);
    }
  }
}

new CiStack(app, 'CiStack');