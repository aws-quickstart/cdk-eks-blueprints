#!/usr/bin/env node
import * as ec2 from '@aws-cdk/aws-ec2';
// import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import BlueprintConstruct from '../examples/blueprint-construct';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };
const id = 'blueprint-construct';

new BlueprintConstruct(app,
  {
    id: id
  },
  props
);

