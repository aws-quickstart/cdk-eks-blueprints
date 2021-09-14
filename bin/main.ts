#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssp from '../lib'
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import BlueprintConstruct from '../examples/blueprint-construct'

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
const clusterName = 'customAmi';
const userData = ec2.UserData.forLinux();
userData.addCommands(`/etc/eks/bootstrap.sh ${clusterName}`);
ssp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .clusterProvider(new ssp.MngClusterProvider({
      version: KubernetesVersion.V1_20,
      customAmi: {
        machineImage: ec2.MachineImage.genericLinux({'ap-southeast-2': 'ami-0be34337b485b2609'}),
        userData: userData,
      }
    }))
    .addons(new ssp.ArgoCDAddOn)
    .teams(new ssp.PlatformTeam({ name: 'platform' }))
    .build(app, clusterName);
