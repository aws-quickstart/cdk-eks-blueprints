import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as logs from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';

export class CiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Setup the CodeBuild project for our GitHub repo
    const source = codebuild.Source.gitHub({
      owner: 'askulkarni2',
      repo: 'quickstart-ssp-amazon-eks',
      reportBuildStatus: true,
      webhook: true,
      webhookFilters: [
        codebuild.FilterGroup
          .inEventOf(codebuild.EventAction.PULL_REQUEST_MERGED)
      ],
    });

    new codebuild.Project(this, 'QuickstartSspAmazonEksBuild', {
      source,
      projectName: 'QuickstartSspAmazonEksBuild', // to uniquely identify our project
      badge: true, // copy the URL from CLI and update the top level README.md
      cache: codebuild.Cache.bucket(new Bucket(this, 'QuickstartSspAmazonEksBuildCache')),
      buildSpec: codebuild.BuildSpec.fromSourceFilename('ci/buildspec.yml'),
      concurrentBuildLimit: 1, // so that we don't exceed any account limits
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, `QuickstartSspAmazonEksBuildLogGroup`),
        }
      }, 
    });
  }
}