
import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import { StackProps } from '@aws-cdk/core';

export class CdkEksBlueprintStack extends cdk.Stack {

    cluster: eks.Cluster;
    vpc: ec2.IVpc;
    nodeGroup: eks.Nodegroup;


    constructor(scope: cdk.Construct, id: string, addOns?: Array<ClusterAddOn>, teams?: Array<TeamSetup>, props?: StackProps) {
        super(scope, id, props);
        /*
         * Supported parameters
        */
        const instanceType = this.node.tryGetContext("instanceType") ?? 't3.medium';
        const vpcId = this.node.tryGetContext("vpc");
        const minClusterSize = this.node.tryGetContext("minSize") ?? 1;
        const maxClusterSize = this.node.tryGetContext("maxSize") ?? 3;
        const vpcSubnets = this.node.tryGetContext("vpcSubnets");


        // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
        // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
        // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
        if(vpcId != null) {
            this.vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { vpcId: vpcId });
        }

        if(this.vpc == null) {
            this.vpc = new ec2.Vpc(this, id + "-vpc");
        }

        this.cluster = new eks.Cluster(this, id, {
            vpc: this.vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: eks.KubernetesVersion.V1_18,
            vpcSubnets: undefined
        });


        this.nodeGroup = this.cluster.addNodegroupCapacity(id + "-ng", {
            instanceType: new ec2.InstanceType(instanceType),
            minSize: minClusterSize,
            maxSize: maxClusterSize
        });

        if (addOns) {
            for (let addOn of addOns) { // must iterate in the strict order
                addOn.deploy(this);
            }
        }

        if (teams) {
            teams.forEach(team => team.setup(this));
        }
    }

    defineParameters() {


    }

}

export interface ClusterAddOn {
    deploy(stack: CdkEksBlueprintStack): void;
}

export interface TeamSetup {
    setup(stack: CdkEksBlueprintStack): void;
}
