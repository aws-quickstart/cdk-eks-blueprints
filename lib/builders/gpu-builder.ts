import * as blueprints from '../../lib';
import * as utils from "../utils";
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { NodegroupAmiType } from 'aws-cdk-lib/aws-eks';

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
        "Name": "Mng-linux",
        "Type": "Managed-linux-Node-Group",
        "LaunchTemplate": "Linux-Launch-Template",
    }
  };
export class GpuBuilder extends blueprints.BlueprintBuilder {
    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     */
    public enableGpu(values?: blueprints.Values): GpuBuilder {
    return this.addOns(
        new blueprints.addons.AwsLoadBalancerControllerAddOn(),
        new blueprints.addons.CertManagerAddOn(),
        new blueprints.addons.CoreDnsAddOn(),
        new blueprints.addons.KubeProxyAddOn(),
        new blueprints.addons.VpcCniAddOn(),
        new blueprints.addons.GpuOperatorAddon({values})
        );
    }
     /**
     * This method helps you prepare a blueprint for setting up windows nodes with 
     * usage tracking addon
     */
     public static builder(): GpuBuilder {
        const builder = new GpuBuilder();
        builder.addOns(
            new blueprints.NestedStackAddOn({
                id: "usage-tracking-addon",
                builder: UsageTrackingAddOn.builder(),
            })); 
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for GPU Accelerator
 */
export class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-pending";

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

