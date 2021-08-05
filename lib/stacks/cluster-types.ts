import * as cdk from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';
import { Team } from '../teams';

/**
 * Props for ClusterInfo.
 */
export interface ClusterInfoProps {

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
 * ClusterInfo desribes an EKS Cluster
 */
export class ClusterInfo {
    
    /**
     * Attributes
     */
    readonly cluster: Cluster;
    readonly version: KubernetesVersion;
    readonly nodeGroup?: Nodegroup;
    readonly autoScalingGroup?: AutoScalingGroup;
    private readonly provisionedAddOns: Map<string, cdk.Construct>;

    /**
     * Constructor for ClusterInfo
     * @param props 
     */
    constructor(props: ClusterInfoProps){
        this.cluster = props.cluster;
        this.nodeGroup = props.nodeGroup ? props.nodeGroup : undefined;
        this.autoScalingGroup = props.autoscalingGroup ? props.autoscalingGroup : undefined;
        this.provisionedAddOns = new Map<string, cdk.Construct>();
    }

    /**
     * Update provisionedAddOns map
     * @param addOn 
     * @param construct 
     */
    public addProvisionedAddOn(addOn: string, construct: cdk.Construct) {
        this.provisionedAddOns.set(addOn, construct);
    }

    /**
     * Given the addOn name, return the provisioned addOn construct
     * @param addOn 
     * @returns undefined
     */
    public getProvisionedAddOn(addOn: string): cdk.Construct | undefined {
        if (this.provisionedAddOns) {
            return this.provisionedAddOns.get(addOn);
        }
        else {
            return undefined;
        }
    }
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
    readonly name?: string;
    deploy(clusterInfo: ClusterInfo): void;
}

/**
 * Optional interface to allow cluster bootstrapping after provisioning of add-ons and teams is complete.
 * Can be leveraged to bootstrap workloads, perform cluster checks. 
 * ClusterAddOn implementation may implement this interface in order to get post deployment hook point.
 */
export interface ClusterPostDeploy {
    postDeploy(clusterInfo: ClusterInfo, teams: Team[]): void;
}

