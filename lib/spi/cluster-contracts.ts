import { ClusterInfo } from '.';
import { Construct } from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { KubernetesVersion } from '@aws-cdk/aws-eks';


/**
 * ClusterProvider is the interface to which all Cluster Providers should conform.
 */
export declare interface ClusterProvider {
    createCluster(scope: Construct, vpc: IVpc): ClusterInfo;
}