
import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import {enableAutoscaling} from "./cluster-autoscaler-manifest"


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
  }

  
}
