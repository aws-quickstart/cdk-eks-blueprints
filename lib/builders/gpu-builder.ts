import { BlueprintBuilder } from '../stacks';
import * as addons from '../addons';
import * as utils from "../utils";
import * as spi from '../spi';
import * as clusterproviders from '../cluster-providers';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import merge from 'ts-deepmerge';
import { ValuesSchema } from '../addons/gpu-operator/values';


/**
 * Configuration options for GPU Builder.
 */
export interface GpuOptions {
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
     * Optional, AMI Type for GPU Nodes @ default AL2_X86_64_GPU 
     */
    gpuAmiType?: NodegroupAmiType,
    /** 
     * Optional, Desired number of nodes to use for the cluster. 
     */
    desiredNodeSize?: number,
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
     * Optional, Cluster Provider Tags.
     */
    clusterProviderTags?: {
        [key: string]: string;
    },

    /**
     * Optional, Node Group Tags for AL2 nodes 
     * which run standard cluster software.
     */
    nodeGroupTags?: {
        [key: string]: string;
    }
}

/**
 * Default props to be used when creating the GPU nodes 
 * for EKS cluster
 */
const defaultOptions: GpuOptions = {
    kubernetesVersion: eks.KubernetesVersion.of("1.27"),
    instanceClass: ec2.InstanceClass.G5,
    instanceSize: ec2.InstanceSize.XLARGE,
    gpuAmiType: NodegroupAmiType.AL2_X86_64_GPU,
    desiredNodeSize: 2,
    minNodeSize: 2,
    maxNodeSize: 3,
    blockDeviceSize: 50,
    clusterProviderTags: {
        "Name": "blueprints-gpu-eks-cluster",
        "Type": "generic-gpu-cluster"
    },
    nodeGroupTags: {
        "Name": "Mng-linux-Gpu",
        "Type": "Managed-linux-Gpu-Node-Group",
        "LaunchTemplate": "Linux-Launch-Template",
    }
  };
export class GpuBuilder extends BlueprintBuilder {
    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     */
    public enableGpu(values?: ValuesSchema): GpuBuilder {
    return this.addOns(
        new addons.AwsLoadBalancerControllerAddOn(),
        new addons.CertManagerAddOn(),
        new addons.CoreDnsAddOn(),
        new addons.KubeProxyAddOn(),
        new addons.VpcCniAddOn(),
        new addons.GpuOperatorAddon({values})
        );
    }
     /**
     * This method helps you prepare a blueprint for setting up windows nodes with 
     * usage tracking addon
     */
     public static builder(options: GpuOptions): GpuBuilder {
        const builder = new GpuBuilder();
        const mergedOptions = merge(defaultOptions, options);
        builder
        .clusterProvider(
            new clusterproviders.GenericClusterProvider({
                version: mergedOptions.kubernetesVersion,
                tags: mergedOptions.clusterProviderTags,
                managedNodeGroups: [
                    addGpuNodeGroup(mergedOptions),
                ]
            })
        )
        .addOns(
            new addons.NestedStackAddOn({
                id: "usage-tracking-addon",
                builder: UsageTrackingAddOn.builder(),
            })); 
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for GPU Accelerator
 */
class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1ug68anj6";

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
 * This function adds a GPU node group to the cluster.
 * @param: options: GpuOptions
 * @returns: blueprints.ManagedNodeGroup
 */
function addGpuNodeGroup(options: GpuOptions): clusterproviders.ManagedNodeGroup {

    return {
        id: "mng-linux-gpu",
        amiType: NodegroupAmiType.AL2_X86_64_GPU,
        instanceTypes: [new ec2.InstanceType(`${options.instanceClass}.${options.instanceSize}`)],
        desiredSize: options.desiredNodeSize, 
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        launchTemplate: {
            tags: options.nodeGroupTags,
            requireImdsv2: false
        }
    };
}

