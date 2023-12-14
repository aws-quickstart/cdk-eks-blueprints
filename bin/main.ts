#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import {InstanceType} from "aws-cdk-lib/aws-ec2";
import {CapacityType, KubernetesVersion, NodegroupAmiType} from "aws-cdk-lib/aws-eks";
// import BlueprintConstruct from '../examples/blueprint-construct';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };

const nodeGrpProps: blueprints.MngClusterProviderProps  = {
  minSize: 1,
  maxSize: 3,
  desiredSize: 1,
  instanceTypes: [new InstanceType('m5a.large')],
  amiType: NodegroupAmiType.AL2_X86_64,
  nodeGroupCapacityType: CapacityType.ON_DEMAND,
  version: KubernetesVersion.V1_27
};

const mngClusterProvider = new blueprints.MngClusterProvider(nodeGrpProps);

const cluster = blueprints.EksBlueprint.builder()
  .clusterProvider(mngClusterProvider)
  .account(account)
  .region(region)
  .addOns(
    new blueprints.CloudWatchInsights(),
  )
  .build(app, 'ConformitronEksBlueprint');

// new BlueprintConstruct(app, props);
