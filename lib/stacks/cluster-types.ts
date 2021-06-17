import * as cdk from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';

/**
 * ClusterInfo describes and EKS cluster.
 */
export interface ClusterInfo {

    /**
     * The EKS cluster.
     */
    readonly cluster: Cluster;

    /**
     * Either and EKS NodeGroup for managed node groups, or and autoscaling group for self-managed.
     */
    readonly nodeGroup?: Nodegroup;

    /**
     * The autoscaling group for the cluster.
     */
    readonly autoscalingGroup?: AutoScalingGroup;

    /**
     * The Kubernetes version for the cluster.
     */
    readonly version: KubernetesVersion;
}

/**
 * ClusterProvider is the interface to which all Cluster Providers should conform.
 */
export interface ClusterProvider {
    createCluster(scope: cdk.Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo;
}

/**
 * ClusterAddOn is the interface to which all Cluster addons should conform.
 */
export interface ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void;
}

