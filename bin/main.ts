#!/usr/bin/env node
import * as ec2 from '@aws-cdk/aws-ec2';
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import BlueprintConstruct from '../examples/blueprint-construct';
import * as ssp from '../lib';

// pre-create a VPC
export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'eks-blueprint-vpc');
  }
}

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const props = { env: { account, region } }

const vpcStack = new VPCStack(app, 'eks-blueprint-vpc', props);


new BlueprintConstruct(app,
  {
    id: 'blueprint-construct',
    vpc: vpcStack.vpc
  },
  props
);

// Added 2nd blueprint for testing custom AMI
const clusterName = 'custom-ami-blueprint';
const userData = ec2.UserData.forLinux();
userData.addCommands(`/etc/eks/bootstrap.sh ${clusterName}`);
ssp.EksBlueprint.builder()
  .account(process.env.CDK_DEFAULT_ACCOUNT)
  .region(process.env.CDK_DEFAULT_REGION)
  .resourceProvider(ssp.GlobalResources.Vpc, new ssp.DirectVpcProvider(vpcStack.vpc))
  .clusterProvider(new ssp.MngClusterProvider({
    version: KubernetesVersion.V1_20,
    maxSize: 1,
    customAmi: {
      machineImage: ec2.MachineImage.genericLinux({
        'us-east-1': 'ami-0b297a512e2852b89',
        'us-west-2': 'ami-06a8c459c01f55c7b',
      }),
      userData: userData,
    }
  }))
  .addOns(new ssp.SSMAgentAddOn)
  .teams(new ssp.PlatformTeam({ name: 'platform' }))
  .build(app, clusterName);
