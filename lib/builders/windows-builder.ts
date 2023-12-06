import { BlueprintBuilder } from '../stacks';
import * as addons from '../addons';
import * as utils from "../utils";
import * as spi from '../spi';
import * as clusterproviders from '../cluster-providers';
import * as resourceproviders from '../resource-providers';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import merge from 'ts-deepmerge';

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
    instanceClass: ec2.InstanceClass,

    /**
     * Required, Instance size to use for the cluster.
     */
    instanceSize: ec2.InstanceSize,

    /**
     * optional, Node IAM Role to be attached to Windows
     * and Non-windows nodes.
     */
    nodeRole?: iam.Role,

    /**
     * Optional, AMI Type for Windows Nodes
     */
    windowsAmiType?: NodegroupAmiType,

    /**
     * Optional, Desired number of nodes to use for the cluster.
     */
    desiredNodeCount?: number,

    /**
     * Optional, Minimum number of nodes to use for the cluster.
     */
    minNodeSize?: number,

    /**
     * Optional, Maximum number of nodes to use for the cluster.
     */
    maxNodeSize?: number,

    /**
     * Optional, Block device size.
     */
    blockDeviceSize?: number,

    /**
     * Optional, No Schedule for Windows Nodes, this allows Windows
     * nodes to be marked as no-schedule by default to prevent any
     * linux workloads from scheduling.
     */
    noScheduleForWindowsNodes?: boolean,

    /**
     * Optional, Cluster Provider Tags.
     */
    clusterProviderTags?: {
        [key: string]: string;
    },

    /**
     * Optional, Generic Node Group Tags for non-windows nodes 
     * which run standard cluster software.
     */
    genericNodeGroupTags?: {
        [key: string]: string;
    }

    /**
     * Optional, Windows Node Group Tags.
     */
    windowsNodeGroupTags?: {
        [key: string]: string;
    }
}

/**
 * Default props to be used when creating the non-windows and windows nodes 
 * for Windows EKS cluster
 */
const defaultOptions: WindowsOptions = {
    kubernetesVersion: eks.KubernetesVersion.of("1.28"),
    instanceClass: ec2.InstanceClass.M5,
    instanceSize: ec2.InstanceSize.XLARGE4,
    nodeRole: resourceproviders.getNamedResource("node-role") as iam.Role,
    windowsAmiType: NodegroupAmiType.WINDOWS_FULL_2022_X86_64,
    desiredNodeSize: 2,
    minNodeSize: 2,
    maxNodeSize: 3,
    blockDeviceSize: 50,
    noScheduleForWindowsNodes: true,
    clusterProviderTags: {
        "Name": "blueprints-windows-eks-cluster",
        "Type": "generic-windows-cluster"
    },
    genericNodeGroupTags: {
        "Name": "Mng-linux",
        "Type": "Managed-linux-Node-Group",
        "LaunchTemplate": "Linux-Launch-Template",
    },
    windowsNodeGroupTags: {
        "Name": "Managed-Node-Group",
        "Type": "Windows-Node-Group",
        "LaunchTemplate": "WindowsLT",
        "kubernetes.io/cluster/windows-eks-blueprint": "owned"  
    }
  };

/** 
 * This builder class helps you prepare a blueprint for setting up 
 * windows nodes with EKS cluster. The `WindowsBuilder` creates the following:
 * 1. An EKS Cluster` with passed k8s version and cluster tags.
 * 2. A non-windows nodegroup for standard software.
 * 3. A windows nodegroup to schedule windows workloads
 */
export class WindowsBuilder extends BlueprintBuilder {

    /**
     * This method helps you prepare a blueprint for setting up windows nodes with
     * usage tracking addon
     */
    public static builder(options: WindowsOptions): WindowsBuilder {
        const builder = new WindowsBuilder();
        const mergedOptions = merge(defaultOptions, options);

        builder
            .clusterProvider(
                new clusterproviders.GenericClusterProvider({
                    version: mergedOptions.kubernetesVersion,
                    tags: mergedOptions.clusterProviderTags,
                    role: resourceproviders.getResource(context => {
                        return new iam.Role(context.scope, 'ClusterRole', {
                            assumedBy: new iam.ServicePrincipal("eks.amazonaws.com"),
                            managedPolicies: [
                                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSClusterPolicy"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSVPCResourceController")
                            ]
                        });
                    }),
                    managedNodeGroups: [
                        addGenericNodeGroup(mergedOptions),
                        addWindowsNodeGroup(mergedOptions)
                    ]
                })
            )
            .addOns(
                new addons.NestedStackAddOn({
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
class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1ubotj5kl";

    public static builder(): spi.NestedStackBuilder {
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
function addGenericNodeGroup(options: WindowsOptions): clusterproviders.ManagedNodeGroup {

    return {
        id: "mng-linux",
        amiType: NodegroupAmiType.AL2_X86_64,
        instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
        desiredSize: options.desiredNodeSize, 
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeRole: options.nodeRole,
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
function addWindowsNodeGroup(options: WindowsOptions): clusterproviders.ManagedNodeGroup {
    const result : clusterproviders.ManagedNodeGroup = {
        id: "mng-windows",
        amiType: options.windowsAmiType,
        instanceTypes: [new ec2.InstanceType(`${options.instanceClass}.${options.instanceSize}`)],
        desiredSize: options.desiredNodeSize, 
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeRole: options.nodeRole,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        diskSize: options.blockDeviceSize,
        tags: options.windowsNodeGroupTags
    };

    if(options.noScheduleForWindowsNodes) {
        utils.setPath(result, "taints", [
            {
                key: "os",
                value: "windows",
                effect: eks.TaintEffect.NO_SCHEDULE
            }
        ]);
    }

    return result;
}
