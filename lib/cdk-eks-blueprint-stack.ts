
import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import {enableAutoscaling} from "./cluster-autoscaler-manifest"
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';
import { CfnTrafficRoutingType, Stack } from '@aws-cdk/core';
import {TeamTroySetup} from './team-troy/setup';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import {readYamlDocument} from './utils/read-file';


export class CdkEksBlueprintStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, "eks-vpc");

    const cluster = new eks.Cluster(this, "Cluster", {
      vpc: vpc,
      defaultCapacity: 0, // we want to manage capacity ourselves
      version: eks.KubernetesVersion.V1_17,
    });


    const ng = cluster.addNodegroupCapacity("eks-nodegroup", {
      instanceType: new ec2.InstanceType("t3.medium"),
      minSize: 2,
      maxSize: 4
    });

    

    enableAutoscaling(this, cluster, ng);
    this.deployContainerInsights(ng, cluster, this.region);

    const troy = new TeamTroySetup().setup(cluster, this);

  } 

  //TODO: move to cloudwatch dir
 deployContainerInsights(ng: Nodegroup, cluster: Cluster, region: string) {
    ng.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    let doc = readYamlDocument('./lib/cloudwatch/cwagent-fluentd-quickstart.yaml')
    let manisfest= doc.replace("{{cluser}}", cluster.clusterName).replace("{{region}}", region);
  }
}
export interface TeamSetup {
  setup(cluster: Cluster, stack: Stack): void;
}
