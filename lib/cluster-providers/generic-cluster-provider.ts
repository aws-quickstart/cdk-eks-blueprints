
import { KubectlV23Layer } from "@aws-cdk/lambda-layer-kubectl-v23";
import { KubectlV24Layer } from "@aws-cdk/lambda-layer-kubectl-v24";
import { KubectlV25Layer } from "@aws-cdk/lambda-layer-kubectl-v25";
import { KubectlV26Layer } from "@aws-cdk/lambda-layer-kubectl-v26";
import { KubectlV27Layer } from "@aws-cdk/lambda-layer-kubectl-v27";
import { KubectlV28Layer } from "@aws-cdk/lambda-layer-kubectl-v28";
import { KubectlV29Layer } from "@aws-cdk/lambda-layer-kubectl-v29";
import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";
import { Tags } from "aws-cdk-lib";
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { AccountRootPrincipal, ManagedPolicy, Role } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { ClusterInfo, ClusterProvider } from "../spi";
import * as utils from "../utils";
import * as constants from './constants';
import { AutoscalingNodeGroup, ManagedNodeGroup } from "./types";
import assert = require('assert');

export function clusterBuilder() {
    return new ClusterBuilder();
}

/**
 * Function that contains logic to map the correct kunbectl layer based on the passed in version. 
 * @param scope in whch the kubectl layer must be created
 * @param version EKS version
 * @returns ILayerVersion or undefined
 */
export function selectKubectlLayer(scope: Construct, version: eks.KubernetesVersion): ILayerVersion | undefined {
    switch(version.version) {
        case "1.23":
            return new KubectlV23Layer(scope, "kubectllayer23");
        case "1.24":
            return new KubectlV24Layer(scope, "kubectllayer24");
        case "1.25":
            return new KubectlV25Layer(scope, "kubectllayer25");
        case "1.26":
            return new KubectlV26Layer(scope, "kubectllayer26");
        case "1.27":
            return new KubectlV27Layer(scope, "kubectllayer27");
        case "1.28":
            return new KubectlV28Layer(scope, "kubectllayer28");
        case "1.29":
            return new KubectlV29Layer(scope, "kubectllayer29");
        case "1.30":
            return new KubectlV30Layer(scope, "kubectllayer30");
    
    }
    
    const minor = version.version.split('.')[1];

    if(minor && parseInt(minor, 10) > 30) {
        return new KubectlV30Layer(scope, "kubectllayer30"); // for all versions above 1.30 use 1.30 kubectl (unless explicitly supported in CDK)
    }
    return undefined;
}
/**
 * Properties for the generic cluster provider, containing definitions of managed node groups,
 * auto-scaling groups, fargate profiles.
 */
export interface GenericClusterProviderProps extends Partial<eks.ClusterOptions> {

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

    /**
     * Tags for the cluster
     */
    tags?: {
        [key: string]: string;
    }
}

export class ManagedNodeGroupConstraints implements utils.ConstraintsType<ManagedNodeGroup> {
    /**
     * id can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
     * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
     */
    id = new utils.StringConstraint(1, 63);

    /**
    * nodes per node group has a soft limit of 450 nodes, and as little as 0. But we multiply that by a factor of 5 to 2250 in case
    * of situations of a hard limit request being accepted, and as a result the limit would be raised
    * https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html
    */
    minSize = new utils.NumberConstraint(0, 2250);

    /**
     * nodes per node group has a soft limit of 450 nodes, and as little as 0. But we multiply that by a factor of 5 to 2250 in case
     * of situations of a hard limit request being accepted, and as a result the limit would be raised
     * https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html
     */
    maxSize = new utils.NumberConstraint(0, 2250);

    /**
     * Nodes per node group has a soft limit of 450 nodes, and as little as 0. But we multiply that by a factor of 5 to 2250 in case
     * of situations of a hard limit request being accepted, and as a result the limit would be raised
     * https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html
     */
    desiredSize = new utils.NumberConstraint(0, 2250);

    /**
     * amiReleaseVersion can be no less than 1 character long, and no greater than 1024 characters long.
     * https://docs.aws.amazon.com/imagebuilder/latest/APIReference/API_Ami.html
     */
    amiReleaseVersion = new utils.StringConstraint(1, 1024);
}

export class AutoscalingNodeGroupConstraints implements utils.ConstraintsType<AutoscalingNodeGroup> {
    /**
    * id can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    id = new utils.StringConstraint(1, 63);

    /**
    * Allowed range is 0 to 5000 inclusive.
    * https://kubernetes.io/docs/setup/best-practices/cluster-large/
    */
    minSize = new utils.NumberConstraint(0, 5000);

    /**
    * Allowed range is 0 to 5000 inclusive.
    * https://kubernetes.io/docs/setup/best-practices/cluster-large/
    */
    maxSize = new utils.NumberConstraint(0, 5000);

    /**
    * Allowed range is 0 to 5000 inclusive.
    * https://kubernetes.io/docs/setup/best-practices/cluster-large/
    */
    desiredSize = new utils.NumberConstraint(0, 5000);
}

export class FargateProfileConstraints implements utils.ConstraintsType<eks.FargateProfileOptions> {
    /**
    * fargateProfileNames can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    fargateProfileName = new utils.StringConstraint(1, 63);
}

export class GenericClusterPropsConstraints implements utils.ConstraintsType<GenericClusterProviderProps> {
    /**
    * managedNodeGroups per cluster have a soft limit of 30 managed node groups per EKS cluster, and as little as 0. But we multiply that
    * by a factor of 5 to 150 in case of situations of a hard limit request being accepted, and as a result the limit would be raised.
    * https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html
    */
    managedNodeGroups = new utils.ArrayConstraint(0, 150);
    /**
    * autoscalingNodeGroups per cluster have a soft limit of 500 autoscaling node groups per EKS cluster, and as little as 0. But we multiply that
    * by a factor of 5 to 2500 in case of situations of a hard limit request being accepted, and as a result the limit would be raised.
    * https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-quotas.html
    */
    autoscalingNodeGroups = new utils.ArrayConstraint(0, 5000);
}

export const defaultOptions = {
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
        this.props = { ...this.props };
    }

    withCommonOptions(options: Partial<eks.ClusterOptions>): this {
        this.props = { ...this.props, ...options };
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

    fargateProfile(name: string, options: eks.FargateProfileOptions): this {
        this.fargateProfiles[name] = options;
        return this;
    }

    version(version: eks.KubernetesVersion): this {
        this.props = { ...this.props, version };
        return this;
    }

    build() {
        return new GenericClusterProvider({
            ...this.props,
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

    constructor(readonly props: GenericClusterProviderProps) {

        this.validateInput(props);

        assert(!(props.managedNodeGroups && props.managedNodeGroups.length > 0
            && props.autoscalingNodeGroups && props.autoscalingNodeGroups.length > 0),
            "Mixing managed and autoscaling node groups is not supported. Please file a request on GitHub to add this support if needed.");
    }

    /**
     * @override
     */
    createCluster(scope: Construct, vpc: ec2.IVpc, secretsEncryptionKey?: IKey, kubernetesVersion?: eks.KubernetesVersion, clusterLogging?: eks.ClusterLoggingTypes[]) : ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.clusterName ?? id;
        const outputClusterName = true;
        if(!kubernetesVersion && !this.props.version) {
            throw new Error("Version was not specified by cluster builder or in cluster provider props, must be specified in one of these");
        }
        const version: eks.KubernetesVersion = kubernetesVersion || this.props.version || eks.KubernetesVersion.V1_30;

        const privateCluster = this.props.privateCluster ?? utils.valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = this.props.vpcSubnets ?? (privateCluster === true ? [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }] : undefined);
        const mastersRole = this.props.mastersRole ?? new Role(scope, `${clusterName}-AccessRole`, {
            assumedBy: new AccountRootPrincipal() 
        });

        const kubectlLayer = this.getKubectlLayer(scope, version);
        const tags = this.props.tags;

        const defaultOptions: Partial<eks.ClusterProps> = {
            vpc,
            secretsEncryptionKey,
            clusterName,
            clusterLogging,
            outputClusterName,
            version,
            vpcSubnets,
            endpointAccess,
            kubectlLayer,
            tags,
            mastersRole,
            defaultCapacity: 0 // we want to manage capacity ourselves
        };

        const clusterOptions = { ...defaultOptions, ...this.props, version };
        // Create an EKS Cluster
        const cluster = this.internalCreateCluster(scope, id, clusterOptions);
        cluster.node.addDependency(vpc);

        const nodeGroups: eks.Nodegroup[] = [];

        this.props.managedNodeGroups?.forEach(n => {
            const nodeGroup = this.addManagedNodeGroup(cluster, n);
            nodeGroups.push(nodeGroup);
        });

        const autoscalingGroups: autoscaling.AutoScalingGroup[] = [];
        this.props.autoscalingNodeGroups?.forEach(n => {
            const autoscalingGroup = this.addAutoScalingGroup(cluster, n);
            autoscalingGroups.push(autoscalingGroup);
        });

        const fargateProfiles = Object.entries(this.props.fargateProfiles ?? {});
        const fargateConstructs : eks.FargateProfile[] = [];
        fargateProfiles?.forEach(([key, options]) => fargateConstructs.push(this.addFargateProfile(cluster, key, options)));

        return new ClusterInfo(cluster, version, nodeGroups, autoscalingGroups, fargateConstructs);
    }

    /**
     * Template method that may be overridden by subclasses to create a specific cluster flavor (e.g. FargateCluster vs eks.Cluster)
     * @param scope
     * @param id
     * @param clusterOptions
     * @returns
     */
    protected internalCreateCluster(scope: Construct, id: string, clusterOptions: any): eks.Cluster {
        return new eks.Cluster(scope, id, clusterOptions);
    }

    /**
     * Can be overridden to provide a custom kubectl layer. 
     * @param scope 
     * @param version 
     * @returns 
     */
    protected getKubectlLayer(scope: Construct, version: eks.KubernetesVersion) : ILayerVersion | undefined {
       return selectKubectlLayer(scope, version);
    }

    /**
     * Adds an autoscaling group to the cluster.
     * @param cluster
     * @param nodeGroup
     * @returns
     */
    addAutoScalingGroup(cluster: eks.Cluster, nodeGroup: AutoscalingNodeGroup): autoscaling.AutoScalingGroup {
        const machineImageType = nodeGroup.machineImageType ?? eks.MachineImageType.AMAZON_LINUX_2;
        const instanceTypeContext = utils.valueFromContext(cluster, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE);
        const instanceType = nodeGroup.instanceType ?? (typeof instanceTypeContext === 'string' ? new ec2.InstanceType(instanceTypeContext) : instanceTypeContext);
        const minSize = nodeGroup.minSize ?? utils.valueFromContext(cluster, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = nodeGroup.maxSize ?? utils.valueFromContext(cluster, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = nodeGroup.desiredSize ?? utils.valueFromContext(cluster, constants.DESIRED_SIZE_KEY, minSize);
        const updatePolicy = nodeGroup.updatePolicy ?? autoscaling.UpdatePolicy.rollingUpdate();

        // Create an autoscaling group
        return cluster.addAutoScalingGroupCapacity(nodeGroup.id, {
            ...nodeGroup,
            ... {
                autoScalingGroupName: nodeGroup.autoScalingGroupName ?? nodeGroup.id,
                machineImageType,
                instanceType,
                minCapacity: minSize,
                maxCapacity: maxSize,
                desiredCapacity: desiredSize,
                updatePolicy,
                vpcSubnets: nodeGroup.nodeGroupSubnets,
            }
        });
    }

    /**
     * Adds a fargate profile to the cluster
     */
    addFargateProfile(cluster: eks.Cluster, name: string, profileOptions: eks.FargateProfileOptions): eks.FargateProfile {
        return cluster.addFargateProfile(name, profileOptions);
    }

    /**
     * Adds a managed node group to the cluster.
     * @param cluster
     * @param nodeGroup
     * @returns
     */
    addManagedNodeGroup(cluster: eks.Cluster, nodeGroup: ManagedNodeGroup): eks.Nodegroup {
        const capacityType = nodeGroup.nodeGroupCapacityType;
        const releaseVersion = nodeGroup.amiReleaseVersion;
        const instanceTypeContext = utils.valueFromContext(cluster, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE);
        const instanceTypes = nodeGroup.instanceTypes ?? ([typeof instanceTypeContext === 'string' ? new ec2.InstanceType(instanceTypeContext) : instanceTypeContext]);
        const minSize = nodeGroup.minSize ?? utils.valueFromContext(cluster, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = nodeGroup.maxSize ?? utils.valueFromContext(cluster, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = nodeGroup.desiredSize ?? utils.valueFromContext(cluster, constants.DESIRED_SIZE_KEY, minSize);

        // Create a managed node group.
        const nodegroupOptions: utils.Writeable<eks.NodegroupOptions> = {
            ...nodeGroup,
            ...{
                nodegroupName: nodeGroup.nodegroupName ?? nodeGroup.id,
                capacityType,
                instanceTypes,
                minSize,
                maxSize,
                desiredSize,
                releaseVersion,
                subnets: nodeGroup.nodeGroupSubnets
            }
        };

        if (nodeGroup.launchTemplate) {
            // Create launch template with provided launch template properties
            const lt = new ec2.LaunchTemplate(cluster, `${nodeGroup.id}-lt`, {
                blockDevices: nodeGroup.launchTemplate.blockDevices,
                machineImage: nodeGroup.launchTemplate?.machineImage,
                securityGroup: nodeGroup.launchTemplate.securityGroup,
                userData: nodeGroup.launchTemplate?.userData,
                requireImdsv2: nodeGroup.launchTemplate?.requireImdsv2,
            });
            utils.setPath(nodegroupOptions, "launchTemplateSpec", {
                id: lt.launchTemplateId!,
                version: lt.latestVersionNumber,
            });
            const tags = Object.entries(nodeGroup.launchTemplate.tags ?? {});
            tags.forEach(([key, options]) => Tags.of(lt).add(key,options));
            if (nodeGroup.launchTemplate?.machineImage) {
                delete nodegroupOptions.amiType;
                delete nodegroupOptions.releaseVersion;
                delete nodeGroup.amiReleaseVersion;
            }
        }

        const result = cluster.addNodegroupCapacity(nodeGroup.id + "-ng", nodegroupOptions);

        if(nodeGroup.enableSsmPermissions) {
            result.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        }

        return result;
    }

    private validateInput(props: GenericClusterProviderProps) {

        utils.validateConstraints(new GenericClusterPropsConstraints, GenericClusterProvider.name, props);
        if (props.managedNodeGroups != undefined)
            utils.validateConstraints(new ManagedNodeGroupConstraints, "ManagedNodeGroup", ...props.managedNodeGroups);
        if (props.autoscalingNodeGroups != undefined)
            utils.validateConstraints(new AutoscalingNodeGroupConstraints, "AutoscalingNodeGroups", ...props.autoscalingNodeGroups);
        if (props.fargateProfiles as any != undefined)
            utils.validateConstraints(new FargateProfileConstraints, "FargateProfiles", ...Object.values(props.fargateProfiles as any));
    }
}
