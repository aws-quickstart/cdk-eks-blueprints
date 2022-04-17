import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import { UpdatePolicy } from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { CommonClusterOptions, FargateProfileOptions, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import { ClusterInfo, ClusterProvider } from "../spi";
import { valueFromContext } from "../utils";
import * as constants from './constants';
import { AutoscalingNodeGroup, ManagedNodeGroup } from "./types";
import assert = require('assert');


export function clusterBuilder() {
    return new ClusterBuilder();
}

/**
 * Properties for the generic cluster provider, containing definitions of managed node groups, 
 * auto-scaling groups, fargate profiles. 
 */
export interface GenericClusterProviderProps extends eks.CommonClusterOptions {

    /**
     * Whether API server is private.
     */
    privateCluster?: boolean,

    /**
     * Array of managed node groups.
     */
    managedNodeGroups?: ManagedNodeGroup[];

    /**
     * Array of autoscaling node groups.
     */
    autoscalingNodeGroups?: AutoscalingNodeGroup[];

    /**
     * Fargate profiles
     */
    fargateProfiles?: {
        [key: string]: eks.FargateProfileOptions;
    }
}

export const defaultOptions = {
    version: eks.KubernetesVersion.V1_21
};

export class ClusterBuilder {

    private props: Partial<GenericClusterProviderProps> = {};
    private privateCluster = false;
    private managedNodeGroups: ManagedNodeGroup[] = [];
    private autoscalingNodeGroups: AutoscalingNodeGroup[] = [];
    private fargateProfiles: {
        [key: string]: eks.FargateProfileOptions;
    } = {};

    constructor() {
        this.props = {...this.props, ...{version: KubernetesVersion.V1_21}};
    }

    withCommonOptions(options: Partial<CommonClusterOptions>): this {
        this.props = {...this.props, ...options};
        return this;
    }

    managedNodeGroup(...nodeGroups: ManagedNodeGroup[]): this {
        this.managedNodeGroups = this.managedNodeGroups.concat(nodeGroups);
        return this;
    }

    autoscalingGroup(...nodeGroups: AutoscalingNodeGroup[]): this {
        this.autoscalingNodeGroups = this.autoscalingNodeGroups.concat(nodeGroups);
        return this;
    }

    fargateProfile(name: string, options: FargateProfileOptions): this {
        this.fargateProfiles[name] = options;
        return this;
    }

    build() {
        return new GenericClusterProvider({
            ...this.props,
            version: this.props.version!, 
            privateCluster: this.privateCluster,
            managedNodeGroups: this.managedNodeGroups, 
            autoscalingNodeGroups: this.autoscalingNodeGroups, 
            fargateProfiles: this.fargateProfiles
        });
    }
}

/**
 * Cluster provider implementation that supports multiple node groups. 
 */
export class GenericClusterProvider implements ClusterProvider {

    constructor(private readonly props: GenericClusterProviderProps) {
        assert(!(props.managedNodeGroups && props.managedNodeGroups.length > 0 
            && props.autoscalingNodeGroups && props.autoscalingNodeGroups.length > 0),
            "Mixing managed and autoscaling node groups is not supported. Please file a request on GitHub to add this support if needed.");
    }

    /** 
     * @override 
     */
    createCluster(scope: Construct, vpc: ec2.IVpc): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.clusterName ?? id;
        const outputClusterName = true;
        const version = this.props.version;
        const privateCluster = this.props.privateCluster ?? valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = this.props.vpcSubnets ?? (privateCluster === true) ? [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }] : undefined;

        const defaultOptions = {
            vpc,
            clusterName,
            outputClusterName,
            version,
            vpcSubnets,
            endpointAccess,
            defaultCapacity: 0 // we want to manage capacity ourselves
        };

        const clusterOptions = {...this.props, ...defaultOptions };
        // Create an EKS Cluster
        const cluster = this.internalCreateCluster(scope, id, clusterOptions);
        cluster.node.addDependency(vpc);

        const nodeGroups: eks.Nodegroup[] = [];
        
        this.props.managedNodeGroups?.forEach( n => {
            const nodeGroup = this.addManagedNodeGroup(cluster, n);
            nodeGroups.push(nodeGroup);
        });

        const autoscalingGroups: autoscaling.AutoScalingGroup[] = [];
        this.props.autoscalingNodeGroups?.forEach( n => {
            const autoscalingGroup = this.addAutoScalingGroup(cluster, n);
            autoscalingGroups.push(autoscalingGroup);
        });

        const fargateProfiles = Object.entries(this.props.fargateProfiles ?? {});
        fargateProfiles?.forEach(([key, options]) => this.addFargateProfile(cluster, key, options));

        return new ClusterInfo(cluster, version, nodeGroups, autoscalingGroups);
    }

    /**
     * Template method that may be overridden by subclasses to create a specific cluster flavor (e.g. FargateCluster vs eks.Cluster)
     * @param scope 
     * @param id 
     * @param clusterOptions 
     * @returns 
     */
    protected internalCreateCluster(scope: Construct, id: string, clusterOptions: any) : eks.Cluster {
        return new eks.Cluster(scope, id, clusterOptions);
    }

    /**
     * Adds an autoscaling group to the cluster.
     * @param cluster 
     * @param nodeGroup 
     * @returns 
     */
    addAutoScalingGroup(cluster: eks.Cluster, nodeGroup: AutoscalingNodeGroup): autoscaling.AutoScalingGroup {
        const machineImageType = nodeGroup.machineImageType ?? eks.MachineImageType.AMAZON_LINUX_2;
        const instanceType = nodeGroup.instanceType ?? valueFromContext(cluster, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE);
        const minSize = nodeGroup.minSize ?? valueFromContext(cluster, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = nodeGroup.maxSize ?? valueFromContext(cluster, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = nodeGroup.desiredSize ?? valueFromContext(cluster, constants.DESIRED_SIZE_KEY, minSize);
        const updatePolicy = nodeGroup.updatePolicy ?? UpdatePolicy.rollingUpdate();

        // Create an autoscaling group
        return cluster.addAutoScalingGroupCapacity(nodeGroup.id, {
            autoScalingGroupName: nodeGroup.id,
            machineImageType,
            instanceType,
            minCapacity: minSize,
            maxCapacity: maxSize,
            desiredCapacity: desiredSize,
            updatePolicy,
        });
    }

    /**
     * Adds a fargate profile to the cluster
     */
    addFargateProfile(cluster: eks.Cluster, name: string, profileOptions: eks.FargateProfileOptions) {
        cluster.addFargateProfile(name, profileOptions);
    }


    /**
     * Adds a managed node group to the cluster.
     * @param cluster 
     * @param nodeGroup 
     * @returns 
     */
    addManagedNodeGroup(cluster: eks.Cluster, nodeGroup: ManagedNodeGroup) : eks.Nodegroup {
        const amiType = nodeGroup.amiType;
        const capacityType = nodeGroup.nodeGroupCapacityType;
        const releaseVersion = nodeGroup.amiReleaseVersion;
        const instanceTypes = nodeGroup.instanceTypes ?? [valueFromContext(cluster, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE)];
        const minSize = nodeGroup.minSize ?? valueFromContext(cluster, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = nodeGroup.maxSize ?? valueFromContext(cluster, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = nodeGroup.desiredSize ?? valueFromContext(cluster, constants.DESIRED_SIZE_KEY, minSize);

        // Create a managed node group.
        const commonNodegroupProps: Partial<eks.NodegroupOptions> = {
            nodegroupName: nodeGroup.id,
            capacityType,
            instanceTypes,
            minSize,
            maxSize,
            desiredSize
        };

        let nodegroupOptions: eks.NodegroupOptions;
        if(nodeGroup.customAmi) {
            // Create launch template if custom AMI is provided.
            const lt = new ec2.LaunchTemplate(cluster, `${nodeGroup.id}-lt`, {
                machineImage: nodeGroup.customAmi?.machineImage,
                userData: nodeGroup.customAmi?.userData,
            });
            nodegroupOptions = {
                ...commonNodegroupProps,
                launchTemplateSpec: {
                    id: lt.launchTemplateId!,
                    version: lt.latestVersionNumber,
                },
            };
        } else {
            nodegroupOptions = {
                ...commonNodegroupProps,
                amiType,
                releaseVersion,
            };
        }

        return cluster.addNodegroupCapacity(nodeGroup.id + "-ng", nodegroupOptions);
    }
}