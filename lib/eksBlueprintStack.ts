
import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import { StackProps } from '@aws-cdk/core';

export class CdkEksBlueprintStack extends cdk.Stack {

    cluster: eks.Cluster;
    vpc: ec2.Vpc;
    nodeGroup: eks.Nodegroup;

    constructor(scope: cdk.Construct, id: string, addOns?: Array<ClusterAddOn>, teams? : Array<TeamSetup>, props?: StackProps ) {
        super(scope, id, props);
        
        // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
        // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
        // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
        this.vpc = new ec2.Vpc(this, id + "-vpc");

        this.cluster = new eks.Cluster(this, id, {
            vpc: this.vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: eks.KubernetesVersion.V1_17,
        });


        this.nodeGroup = this.cluster.addNodegroupCapacity(id + "-ng", {
            instanceType: new ec2.InstanceType("t3.medium"),
            minSize: 1,
            maxSize: 4
        });

        if(addOns) {
            for(let addOn of addOns) { // must iterate in the strict order
                addOn.deploy(this);
            }
        }

        if(teams) {
            teams.forEach(team => team.setup(this));
        }
    }
}

export interface ClusterAddOn {
    deploy(stack: CdkEksBlueprintStack): void;
}

export interface TeamSetup {
    setup(stack: CdkEksBlueprintStack): void;
}
