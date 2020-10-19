import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import { TeamSetup } from '../cdk-eks-blueprint-stack';


export class TeamRikerSetup implements TeamSetup {
  setup(cluster: eks.Cluster, stack: cdk.Stack) {
    const namespace = cluster.addManifest('team-riker', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-riker' }
    });
  } 
}