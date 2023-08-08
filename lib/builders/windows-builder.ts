import * as blueprints from '../../lib';
import * as utils from "../utils";
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodegroupAmiType } from 'aws-cdk-lib/aws-eks';

/**
 * Configuration options for Windows Builder.
 */
export interface WindowsOptions {
    /**
     * Required, Kubernetes version to use for the cluster.
     */
    kubernetesVersion: eks.KubernetesVersion,

    /** 
     * Required, Instance class to use for the cluster. 
     */
    instanceClass: ec2.InstanceType,

    /** 
     * Required, Instance size to use for the cluster. 
     */
    instanceSize: ec2.InstanceSize,

    /** 
     * Required, Desired number of nodes to use for the cluster. 
     */
    desiredNodeSize: number,

    /** 
     * Required, Minimum number of nodes to use for the cluster. 
     */
    minNodeSize: number,

    /** 
     * Required, Maximum number of nodes to use for the cluster. 
     */
    maxNodeSize: number,

    /** 
     * Required, Block device size.
     */
    blockDeviceSize: number,

    /**
     * Optional, No Schedule for Windows Nodes.
     */
    noScheduleForWindowsNodes?: boolean,

    /**
     * Required, Cluster Provider Tags.
     */
    clusterProviderTags: {
        [key: string]: string;
    },

    /**
     * Required, Generic Node Group Tags.
     */
    genericNodeGroupTags: {
        [key: string]: string;
    }

    /**
     * Required, Windows Node Group Tags.
     */
    windowsNodeGroupTags: {
        [key: string]: string;
    }
}


/** 
 * This class helps you prepare a blueprint for setting up windows nodes with 
 * Amazon EKS cluster.
 */
export class WindowsBuilder extends blueprints.BlueprintBuilder {

    /**
     * This method helps you prepare a blueprint for setting up windows nodes with 
     * usage tracking addon
     */
    public static builder(options: WindowsOptions): WindowsBuilder {
        const builder = new WindowsBuilder();

        builder
            .clusterProvider(
                new blueprints.GenericClusterProvider({
                    version: options.kubernetesVersion,
                    tags: options.clusterProviderTags,
                    role: blueprints.getResource(context => {
                        return new iam.Role(context.scope, 'ClusterRole', { 
                            assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
                            managedPolicies: [
                                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSVPCResourceController")
                            ]
                        });
                    }),
                    managedNodeGroups: [
                        addGenericNodeGroup(options),
                        addWindowsNodeGroup(options)
                    ]
                })
            )
            .addOns(
                new blueprints.NestedStackAddOn({
                    id: "usage-tracking-addon",
                    builder: UsageTrackingAddOn.builder(),
                })
            );
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for Windows Accelerator
 */
export class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1ubotj5kl";

    public static builder(): blueprints.NestedStackBuilder {
        return {
            build(scope: Construct, id: string, props: NestedStackProps) {
                return new UsageTrackingAddOn(scope, id, props);
            }
        };
    }

    constructor(scope: Construct, id: string, props: NestedStackProps) {
        super(scope, id, utils.withUsageTracking(UsageTrackingAddOn.USAGE_ID, props));
    }
}

/**  
 * This function adds a generic node group to the windows cluster.
 * @param: options: WindowsOptions
 * @returns: blueprints.ManagedNodeGroup
 */
function addGenericNodeGroup(options: WindowsOptions): blueprints.ManagedNodeGroup {

    return {
        id: "mng-linux",
        amiType: NodegroupAmiType.AL2_X86_64,
        instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
        desiredSize: options.desiredNodeSize,
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        launchTemplate: {
            tags: options.genericNodeGroupTags,
            requireImdsv2: false
        }
    };
}

/**
 * This function adds a windows node group to the windows cluster.
 * @param options: WindowsOptions
 * @returns: blueprints.ManagedNodeGroup
 */
function addWindowsNodeGroup(options: WindowsOptions): blueprints.ManagedNodeGroup {
    const result : blueprints.ManagedNodeGroup = {
        id: "mng-windows",
        amiType: NodegroupAmiType.WINDOWS_CORE_2022_X86_64,
        instanceTypes: [new ec2.InstanceType(`${options.instanceClass}.${options.instanceSize}`)],
        desiredSize: options.desiredNodeSize,
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        diskSize: options.blockDeviceSize,
        tags: options.windowsNodeGroupTags
    };

    if(options.noScheduleForWindowsNodes) {
        blueprints.utils.setPath(result, "taints", [
            {
                key: "os",
                value: "windows",
                effect: eks.TaintEffect.NO_SCHEDULE
            }
        ]);
    }

    return result;
}
