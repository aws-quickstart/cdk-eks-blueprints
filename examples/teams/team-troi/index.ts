import * as eks from "@aws-cdk/aws-eks";
import * as s3 from "@aws-cdk/aws-s3";
import * as cdk from '@aws-cdk/core';
import { ClusterInfo, Team } from '../../../lib';


export class TeamTroi implements Team {
    readonly name: string = 'team-troi';

    setup(clusterInfo: ClusterInfo) {
        const cluster = clusterInfo.cluster;
        const stack = cluster.stack;
        const namespace = cluster.addManifest(this.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: this.name,
                annotations: { "argocd.argoproj.io/sync-wave": "-1" }
            }
        });

        const policies = this.setupNamespacePolicies(cluster);

        policies.node.addDependency(namespace);

        const sa = cluster.addServiceAccount('inf-backend', { name: 'inf-backend', namespace: this.name });
        sa.node.addDependency(namespace);
        const bucket = new s3.Bucket(stack, 'inf-backend-bucket');
        bucket.grantReadWrite(sa);
        new cdk.CfnOutput(stack, this.name + '-sa-iam-role', { value: sa.role.roleArn })
    }

    setupNamespacePolicies(cluster: eks.Cluster) : eks.KubernetesManifest {
        const quotaName = this.name + "-quota";
        return cluster.addManifest(quotaName, {
            apiVersion: 'v1',
            kind: 'ResourceQuota',
            metadata: { 
                name: quotaName,
                namespace:  'team-troi' 
            },
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