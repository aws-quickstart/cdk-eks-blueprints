import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as s3 from "@aws-cdk/aws-s3";
import { TeamSetup } from '../cdk-eks-blueprint-stack';


export class TeamBurnhamSetup implements TeamSetup {
  setup(cluster: eks.Cluster, stack: cdk.Stack) {
    const namespace = cluster.addManifest('team-burnham', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-burnham' }
    });
  } 
}