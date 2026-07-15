import { BlueprintBuilder } from '../stacks';
import * as addons from '../addons';
import * as clusterproviders from '../cluster-providers';
import * as eks from "aws-cdk-lib/aws-eks-v2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { NodegroupAmiType } from 'aws-cdk-lib/aws-eks-v2';
import { merge } from "ts-deepmerge";
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
    kubernetesVersion: eks.KubernetesVersion.V1_35,
    instanceClass: ec2.InstanceClass.G5,
    instanceSize: ec2.InstanceSize.XLARGE,
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
            new addons.UsageTrackingAddOn({tags: ["gpu-builder"]}),
        ); 
        return builder;
    }
}

/**  
 * This function adds a GPU node group to the cluster.
 * @param: options: GpuOptions
 * @returns: blueprints.ManagedNodeGroup
 */
function addGpuNodeGroup(options: GpuOptions): clusterproviders.ManagedNodeGroup {

    return {
        id: "mng-linux-gpu-01",
        amiType: NodegroupAmiType.AL2023_ARM_64_NVIDIA,
        instanceTypes: [new ec2.InstanceType(`${options.instanceClass}.${options.instanceSize}`)],
        desiredSize: options.desiredNodeSize, 
        minSize: options.minNodeSize, 
        maxSize: options.maxNodeSize,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        launchTemplate: {
            tags: options.nodeGroupTags,
            requireImdsv2: false,
            blockDevices: [
                {
                    deviceName: "/dev/sda1",
                    volume: ec2.BlockDeviceVolume.ebs(options.blockDeviceSize!),
                }
            ]
        }
    };
}

