#!/usr/bin/env node
import * as ec2 from '@aws-cdk/aws-ec2';
// import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import BlueprintConstruct from '../examples/blueprint-construct';
// import * as ssp from '../lib';

// pre-create a VPC
export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'eks-blueprint-vpc');
  }
}

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };
const id = 'blueprint-construct';

const vpcStack = new VPCStack(app, 'eks-blueprint-vpc', props);

new BlueprintConstruct(app,
  {
    id: id,
    vpc: vpcStack.vpc
  },
  props
);

