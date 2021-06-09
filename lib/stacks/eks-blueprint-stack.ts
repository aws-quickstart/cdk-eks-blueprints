
import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import { StackProps } from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';

import { EC2ClusterProvider } from '../cluster-providers/ec2-cluster-provider';
import { Team } from '../teams'

export class EksBlueprintProps {

    readonly id: string;

    /**
     * Defaults to id if not provided
     */
    readonly name?: string;

    /**
     * Add-ons if any.
     */
    readonly addOns?: Array<ClusterAddOn> = [];

    /**
     * Teams if any
     */
    readonly teams?: Array<Team> = [];

    /**
     * EC2 or Fargate are supported in the blueprint but any implementation conforming the interface
     * will work
     */
    readonly clusterProvider?: ClusterProvider = new EC2ClusterProvider;

    /**
     * Kubernetes version (must be initialized for addons to work properly)
     */
    readonly version?: KubernetesVersion = KubernetesVersion.V1_19;

}

export class EksBlueprint extends cdk.Stack {

    constructor(scope: cdk.Construct, blueprintProps: EksBlueprintProps, props?: StackProps) {
        super(scope, blueprintProps.id, props);

        this.validateInput(blueprintProps);
        /*
         * Supported parameters
        */
        const vpcId = this.node.tryGetContext("vpc");
        const vpc = this.initializeVpc(vpcId);

        const clusterProvider = blueprintProps.clusterProvider ?? new EC2ClusterProvider;

        const clusterInfo = clusterProvider.createCluster(this, vpc, blueprintProps.version ?? KubernetesVersion.V1_19);

        for (let addOn of (blueprintProps.addOns ?? [])) { // must iterate in the strict order
            addOn.deploy(clusterInfo);
        }
        if (blueprintProps.teams != null) {
            blueprintProps.teams.forEach(team => team.setup(clusterInfo));
        }
    }

    private validateInput(blueprintProps: EksBlueprintProps) {
        const teamNames = new Set<string>();
        if (blueprintProps.teams) {
            blueprintProps.teams.forEach(e => {
                if (teamNames.has(e.name)) {
                    throw new Error(`Team ${e.name} is registered more than once`);
                }
                teamNames.add(e.name);
            });
        }
    }

    initializeVpc(vpcId: string): IVpc {
        const id = this.node.id;
        let vpc = undefined;

        if (vpcId != null) {
            if (vpcId === "default") {
                console.log(`looking up completely default VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { isDefault: true });
            } else {
                console.log(`looking up non-default ${vpcId} VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { vpcId: vpcId });
            }
        }

        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
            vpc = new ec2.Vpc(this, id + "-vpc");
        }

        return vpc;
    }
}

export interface ClusterProvider {
    createCluster(scope: cdk.Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo;
}

export interface ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void;
}

export interface ClusterInfo {

    readonly cluster: Cluster;

    /**
     * Either and EKS NodeGroup for managed node groups, or and autoscaling group for self-managed.
     */
    readonly nodeGroup?: Nodegroup;

    readonly autoscalingGroup?: AutoScalingGroup;

    readonly version: KubernetesVersion;
}
