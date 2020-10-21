import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as s3 from "@aws-cdk/aws-s3";
import { TeamSetup } from '../cdk-eks-blueprint-stack';


export class TeamTroySetup implements TeamSetup {
  readonly teamName: string = 'team-troy';

  setup(cluster: eks.Cluster, stack: cdk.Stack) {
    const namespace = cluster.addManifest(this.teamName, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: this.teamName,
        annotations: { "argocd.argoproj.io/sync-wave": "-1" }
      }
    });

    this.setupNamespacePolicies(cluster);

    const sa = cluster.addServiceAccount('inf-backend', { name: 'inf-backend', namespace: this.teamName });
    sa.node.addDependency(namespace);
    const bucket = new s3.Bucket(stack, 'djl-demo');
    bucket.grantReadWrite(sa);
    new cdk.CfnOutput(stack, this.teamName + 'sa-iam-role', { value: sa.role.roleArn })
  }

  setupNamespacePolicies(cluster: eks.Cluster) {
    const quotaName = this.teamName + "-quota";
    cluster.addManifest(quotaName, {
      apiVersion: 'v1',
      kind: 'ResourceQuota',
      metadata: { name: quotaName },
      spec: {
        hard: {
          'requests.cpu': '10',
          'requests.memory': '10Gi',
          'limits.cpu': '20',
          'limits.memory': '20Gi'
        }
      }
    })
  }
}