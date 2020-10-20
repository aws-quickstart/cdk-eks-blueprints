import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as s3 from "@aws-cdk/aws-s3";
import { TeamSetup } from '../cdk-eks-blueprint-stack';


export class TeamTroySetup implements TeamSetup {
  setup(cluster: eks.Cluster, stack: cdk.Stack) {
    const namespace = cluster.addManifest('team-troy', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-troy' }
    });

    const sa = cluster.addServiceAccount('inf-backend', {name: 'inf-backend', namespace: 'team-troy'});
    sa.node.addDependency(namespace);
    const bucket = new s3.Bucket(stack, 'djl-demo');
    bucket.grantReadWrite(sa);
    new cdk.CfnOutput(stack, 'ServiceAccountIamRole', { value: sa.role.roleArn })
  } 
}