import * as assert from "assert";
import { Construct } from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import * as ec2 from "@aws-cdk/aws-ec2";


// Cluster
import { ClusterInfo, ClusterProvider } from "..";

// Utils 
import { valueFromContext } from '../utils/context-utils';

// Constants 
import * as constants from './constants';
import { ManagedNodeGroup } from "./types";



/**
 * Configuration options for the cluster provider.
 */
export interface MngClusterProviderProps extends eks.CommonClusterOptions, ManagedNodeGroup {
    /**
    * The name for the cluster.
    * @deprecated use #clusterName
    */
    name?: string

    /**
     * Is it a private only EKS Cluster?
     * Defaults to private_and_public cluster, set to true for private cluster
     * @default false
     */
    privateCluster?: boolean;

    /**
     * Affects both control plane and the managed node group.
     */
    vpcSubnets?: ec2.SubnetSelection[];
}

/**
 * MngClusterProvider provisions an EKS cluster with a managed node group for managed capacity.
 */
export class MngClusterProvider implements ClusterProvider {

    readonly props: MngClusterProviderProps;

    constructor(props?: MngClusterProviderProps) {
        this.props = props ?? { version: eks.KubernetesVersion.V1_20 };
    }

    createCluster(scope: Construct, vpc: ec2.IVpc): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.name ?? this.props.clusterName ?? id;
        const outputClusterName = true;
        const version = this.props.version;
        const privateCluster = this.props.privateCluster ?? valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = (privateCluster === true) ? [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }] : this.props.vpcSubnets;

        // Create an EKS Cluster
        const cluster = new eks.Cluster(scope, id, {
            vpc,
            clusterName,
            outputClusterName,
            version,
            vpcSubnets,
            endpointAccess,
            defaultCapacity: 0 // we want to manage capacity ourselves
        });

        // Props for the managed node group.
        const amiType = this.props.amiType;
        const capacityType = this.props.nodeGroupCapacityType;
        const releaseVersion = this.props.amiReleaseVersion;
        const instanceTypes = this.props.instanceTypes ?? [valueFromContext(scope, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE)];
        const minSize = this.props.minSize ?? valueFromContext(scope, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = this.props.maxSize ?? valueFromContext(scope, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = this.props.desiredSize ?? valueFromContext(scope, constants.DESIRED_SIZE_KEY, minSize);

        // Create a managed node group.
        const commonNodegroupProps = {
            capacityType,
            instanceTypes,
            minSize,
            maxSize,
            desiredSize,
        };

        let nodegroupProps: eks.NodegroupOptions;
        if(this.props.customAmi) {
            // Create launch template if custom AMI is provided.
            const lt = new ec2.LaunchTemplate(scope, `${id}-lt`, {
                machineImage: this.props.customAmi?.machineImage,
                userData: this.props.customAmi?.userData,
            });
            nodegroupProps = {
                ...commonNodegroupProps,
                launchTemplateSpec: {
                    id: lt.launchTemplateId!,
                    version: lt.latestVersionNumber,
                },
            };
        } else {
            nodegroupProps = {
                ...commonNodegroupProps,
                amiType,
                releaseVersion,
            };
        }

        const mng = cluster.addNodegroupCapacity(id + "-ng", nodegroupProps);
        return new ClusterInfo(cluster, version, mng);
    }
}

/**
 * Validates that cluster is backed by EC2 either through a managed node group or through a self-managed autoscaling group.
 * @param clusterInfo 
 * @param source Used for error message to identify the source of the check
 * @returns 
 */
export function assertEC2NodeGroup(clusterInfo: ClusterInfo, source: string): eks.Nodegroup | AutoScalingGroup {
    assert(clusterInfo.nodeGroup, `${source} is supported with EKS EC2 only`);
    return clusterInfo.nodeGroup!;
}