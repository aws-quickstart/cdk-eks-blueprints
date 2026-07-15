import { KubectlV29Layer } from "@aws-cdk/lambda-layer-kubectl-v29";
import { KubectlV30Layer } from "@aws-cdk/lambda-layer-kubectl-v30";
import { KubectlV31Layer } from "@aws-cdk/lambda-layer-kubectl-v31";
import { KubectlV32Layer } from "@aws-cdk/lambda-layer-kubectl-v32";
import { KubectlV33Layer } from "@aws-cdk/lambda-layer-kubectl-v33";
import { KubectlV34Layer } from "@aws-cdk/lambda-layer-kubectl-v34";
import { KubectlV35Layer } from "@aws-cdk/lambda-layer-kubectl-v35";
import { KubectlV36Layer } from "@aws-cdk/lambda-layer-kubectl-v36";

import { Arn, ArnFormat, Tags } from "aws-cdk-lib";
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks-v2";
import { CfnCluster } from "aws-cdk-lib/aws-eks";
import { AccountRootPrincipal, ManagedPolicy, Role } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { ClusterInfo, ClusterProvider } from "../spi";
import * as utils from "../utils";
import * as constants from './constants';
import { AutoModeNodeClassSpec, AutoModeNodePoolSpec, AutoscalingNodeGroup, ManagedNodeGroup } from "./types";
import assert = require('assert');
import * as semver from "semver";

/**
 * Function that contains logic to map the correct kunbectl layer based on the passed in version.
 * @param scope in whch the kubectl layer must be created
 * @param version EKS version
 * @returns ILayerVersion or undefined
 */
export function selectKubectlLayer(scope: Construct, version: eks.KubernetesVersion): ILayerVersion | undefined {
    switch(version.version) {
        case "1.29":
            return new KubectlV29Layer(scope, "kubectllayer29");
        case "1.30":
            return new KubectlV30Layer(scope, "kubectllayer30");
        case "1.31":
            return new KubectlV31Layer(scope, "kubectllayer30");
        case "1.32":
            return new KubectlV32Layer(scope, "kubectllayer32");
        case "1.33":
            return new KubectlV33Layer(scope, "kubectllayer33");
        case "1.34":
            return new KubectlV34Layer(scope, "kubectllayer34");
        case "1.35":
            return new KubectlV35Layer(scope, "kubectllayer35");
        case "1.36":
            return new KubectlV36Layer(scope, "kubectllayer36");

    }

    const minor = version.version.split('.')[1];

    if(minor && parseInt(minor, 10) > 36) {
        return new KubectlV36Layer(scope, "kubectllayer36"); // for all versions above 1.35 use 1.35 kubectl (unless explicitly supported in CDK)
    }
    return undefined;
}

export function clusterBuilder() {
    return new ClusterBuilder();
}

export interface ComputeConfig extends eks.ComputeConfig {
  
  /**
   * Extra node pools to be added to the Auto Mode Cluster
   */
  extraNodePools?: {
    [key: string]: AutoModeNodePoolSpec;
  };

  /**
   * Extra node classes to be added to the Auto Mode Cluster
   */
  extraNodeClasses?: {
    [key: string]: AutoModeNodeClassSpec;
  }

}


/**
 * Properties for the generic cluster provider, containing definitions of managed node groups,
 * auto-scaling groups, fargate profiles.
 */
export interface GenericClusterProviderProps extends Omit<Partial<eks.ClusterProps>, "kubectlProviderOptions"> {

    /**
     * Whether cluster has internet access.
     */
    isolatedCluster?: boolean,

    /**
     * Whether API server is private.
     */
    privateCluster?: boolean,

    /**
     * Options for the kubectl provider. The kubectlLayer is automatically resolved
     * from the cluster version if not explicitly provided.
     */
    kubectlProviderOptions?: Partial<eks.KubectlProviderOptions>,

    /**
     * Array of managed node groups.
     */
    managedNodeGroups?: ManagedNodeGroup[];

    /**
     * Array of autoscaling node groups.
     */
    autoscalingNodeGroups?: AutoscalingNodeGroup[];

    /**
     * EKS Automode compute config
     */
    compute?: ComputeConfig;

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


export class ComputeConfigConstraints implements utils.ConstraintsType<ComputeConfig> {
    nodePools = new utils.ArrayConstraint(0, 2);
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
    private compute: ComputeConfig;
    private fargateProfiles: {
        [key: string]: eks.FargateProfileOptions;
    } = {};

    constructor() {
        this.props = { ...this.props };
    }

    withCommonOptions(options: Partial<eks.ClusterProps>): this {
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

    computeConfig(config: ComputeConfig): this {
        this.compute = config;
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
            compute: this.compute,
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

        const computeTypesEnabled = [
            props.managedNodeGroups && props.managedNodeGroups.length > 0,
            props.autoscalingNodeGroups && props.autoscalingNodeGroups.length > 0,
            props.compute != undefined
        ].filter(Boolean).length;

        // Assert that only one compute type is enabled
        assert(
            computeTypesEnabled <= 1,
            'Only one compute type can be enabled: managed node groups, autoscaling node groups, or automode configuration.  Mixing these is not supported. Please file a request on GitHub to add this support if needed.'
        );
    }

    /**
     * @override
     */
    createCluster(scope: Construct, vpc: ec2.IVpc, secretsEncryptionKey?: IKey, kubernetesVersion?: eks.KubernetesVersion, clusterLogging?: eks.ClusterLoggingTypes[], ipFamily?: eks.IpFamily): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.clusterName ?? id;
        if (!kubernetesVersion && !this.props.version) {
            throw new Error("Version was not specified by cluster builder or in cluster provider props, must be specified in one of these");
        }
        const version: eks.KubernetesVersion = kubernetesVersion || this.props.version || eks.KubernetesVersion.V1_30;

        let privateCluster = this.props.privateCluster ?? utils.valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        privateCluster = privateCluster ? privateCluster === 'true' : false;
        let isolatedCluster = this.props.isolatedCluster ?? utils.valueFromContext(scope, constants.ISOLATED_CLUSTER, false);
        isolatedCluster = isolatedCluster ? isolatedCluster === 'true' : false;

        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = this.props.vpcSubnets ?? (isolatedCluster === true ? [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }] : privateCluster === true ? [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }] : undefined);
        const mastersRole = this.props.mastersRole ?? new Role(scope, `${clusterName}-AccessRole`, {
            assumedBy: new AccountRootPrincipal()
        });


        const kubectlLayer = this.props.kubectlProviderOptions?.kubectlLayer ?? this.getKubectlLayer(scope, version);
        let kubectlProviderOptions: eks.KubectlProviderOptions | undefined;
        if (kubectlLayer) {
            kubectlProviderOptions = { ...this.props.kubectlProviderOptions, kubectlLayer };
        } else {
            utils.logger.warn("No kubectlLayer could be resolved for version " + version.version + ". In this version of EKS Blueprints, 1.29 is the lowest supported version for which the kubectl provider is automatically resolved. Kubectl-based operations (manifests, helm charts) will not work. Provide a kubectlLayer explicitly via kubectlProviderOptions to use an older version.");
            if (this.props.kubectlProviderOptions) {
                utils.logger.warn("kubectlProviderOptions were specified but will be ignored without a kubectlLayer.");
            }
            kubectlProviderOptions = undefined;
        }
        const tags = this.props.tags;

        const defaultOptions: Partial<eks.ClusterProps> = {
            vpc,
            secretsEncryptionKey,
            clusterName,
            clusterLogging,
            version,
            vpcSubnets,
            endpointAccess,
            tags,
            mastersRole,
            defaultCapacityType: eks.DefaultCapacityType.NODEGROUP
        };

        const clusterOptions = { ...defaultOptions, ...this.props, version, ipFamily, kubectlProviderOptions };

        if (clusterOptions.defaultCapacityType !== eks.DefaultCapacityType.AUTOMODE) {
            clusterOptions.defaultCapacity = 0;
        }

        // Create an EKS Cluster
        const cluster = this.internalCreateCluster(scope, id, clusterOptions);
        cluster.node.addDependency(vpc);
        const nodeGroups: eks.Nodegroup[] = [];

        this.props.managedNodeGroups?.forEach(n => {
            const nodeGroup = this.addManagedNodeGroup(cluster as eks.Cluster, n);
            nodeGroups.push(nodeGroup);
        });

        const autoscalingGroups: autoscaling.AutoScalingGroup[] = [];
        this.props.autoscalingNodeGroups?.forEach(n => {
            const autoscalingGroup = this.addAutoScalingGroup(cluster as eks.Cluster, n);
            autoscalingGroups.push(autoscalingGroup);
        });

        const autoMode = clusterOptions.defaultCapacityType != undefined && (clusterOptions.defaultCapacityType as eks.DefaultCapacityType) == eks.DefaultCapacityType.AUTOMODE;
        if (autoMode && semver.lt(semver.coerce(version.version)!,"1.29.0")) {
          throw new Error("EKS Auto Mode is only supported for cluster versions of 1.29 or higher.");
        }

        const fargateProfiles = Object.entries(this.props.fargateProfiles ?? {});
        const fargateConstructs: eks.FargateProfile[] = [];
        fargateProfiles?.forEach(([key, options]) => fargateConstructs.push(this.addFargateProfile(cluster as eks.Cluster, key, options)));

        const nodePools = Object.entries(this.props.compute?.extraNodePools ?? {});
        const nodePoolConstructs: eks.KubernetesManifest[] = [];
        nodePools.forEach(([key, options]) => nodePoolConstructs.push(this.addNodePool(cluster as eks.Cluster, key, options)));

        const nodeClasses = Object.entries(this.props.compute?.extraNodeClasses ?? {});
        const nodeClassConstructs: eks.KubernetesManifest[] = [];
        nodeClasses.forEach(([key, options]) => nodeClassConstructs.push(this.addNodeClass(cluster as eks.Cluster, key, options)));

        return new ClusterInfo(cluster, version, nodeGroups, autoscalingGroups, autoMode, fargateConstructs);
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
    protected getKubectlLayer(scope: Construct, version: eks.KubernetesVersion): ILayerVersion | undefined {
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
     * Add a node pool to the cluster
     */
    addNodePool(cluster: eks.Cluster, name: string, pool: AutoModeNodePoolSpec) {
      const labels =  pool.labels || {};
      const annotations = pool.annotations || {};
      const taints = pool.taints || [];
      const startupTaints = pool.startupTaints || [];
      const requirements = pool.requirements || [];
      const disruption = pool.disruption || null;
      const limits = pool.limits || null;
      const weight = pool.weight || null;
      const poolManifest : any = {
        apiVersion: "karpenter.sh/v1",
        kind: "NodePool",
        metadata: {name: name},
        spec: {
          template: {
            metadata: {labels: labels, annotations: annotations},
            spec: {
              nodeClassRef: {
                  name: pool.nodeClassName || "default",
                  group: "eks.amazonaws.com",
                  kind: "NodeClass"
              },
              taints: taints,
              startupTaints: startupTaints,
              requirements: utils.convertKeyPair(requirements),
              expireAfter: pool.expireAfter
            },
          },
          disruption: disruption,
          limits: limits,
          weight: weight
        },
      };
      
      if (pool.replicas !== undefined) {
        poolManifest.spec.replicas = pool.replicas;
      }
      
      return cluster.addManifest(name, poolManifest);
    }
    
    addNodeClass(cluster: eks.Cluster, name: string, nodeClass: AutoModeNodeClassSpec) {
      const defaultRole = Arn.split(((cluster.node.defaultChild as CfnCluster).computeConfig as CfnCluster.ComputeConfigProperty).nodeRoleArn!, ArnFormat.SLASH_RESOURCE_NAME).resourceName;
      const role = nodeClass.role?.roleName ?? (nodeClass.instanceProfile ? null : defaultRole);
      const classManifest = {
        apiVersion: "eks.amazonaws.com/v1",
        kind: "NodeClass",
        metadata: {name: name},
        spec: {
          role: role,
          instanceProfile: nodeClass.instanceProfile ?? null,
          subnetSelectorTerms: nodeClass.subnetSelectorTerms,
          securityGroupSelectorTerms: nodeClass.securityGroupSelectorTerms,
          podSubnetSelectorTerms: nodeClass.podSubnetSelectorTerms,
          podSecurityGroupSelectorTerms: nodeClass.podSecurityGroupSelectorTerms,
          capacityReservationSelectorTerms: nodeClass.capacityReservationSelectorTerms,
          snatPolicy: nodeClass.snatPolicy,
          networkPolicy: nodeClass.networkPolicy,
          networkPolicyEventLogs: nodeClass.networkPolicyEventLogs,
          ephemeralStorage: nodeClass.ephemeralStorage,
          advancedNetworking: nodeClass.advancedNetworking,
          advancedSecurity: nodeClass.advancedSecurity,
          certificateBundles: nodeClass.certificateBundles,
          tags: nodeClass.tags,
        },
      };

      const manifest = cluster.addManifest(name, classManifest);
      if (nodeClass.role) {
        manifest.node.addDependency(nodeClass.role);
      }
      return manifest;
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
        const amiType = nodeGroup.amiType ?? constants.DEFAULT_AMI;
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
                amiType,
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
                httpPutResponseHopLimit: nodeGroup.launchTemplate?.httpPutResponseHopLimit,
            });
            utils.setPath(nodegroupOptions, "launchTemplateSpec", {
                id: lt.launchTemplateId!,
                version: lt.latestVersionNumber,
            });
            const tags = Object.entries(nodeGroup.launchTemplate.tags ?? {});
            tags.forEach(([key, options]) => Tags.of(lt).add(key, options));
            if (nodeGroup.launchTemplate?.machineImage) {
                delete nodegroupOptions.amiType;
                delete nodegroupOptions.releaseVersion;
                delete nodeGroup.amiReleaseVersion;
            }
        }

        const result = cluster.addNodegroupCapacity(nodeGroup.id + "-ng", nodegroupOptions);

        if (nodeGroup.enableSsmPermissions) {
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
        if (props.compute != undefined)
            utils.validateConstraints(new ComputeConfigConstraints, "ComputeConfigConstraints", props.compute);
        if (props.fargateProfiles as any != undefined)
            utils.validateConstraints(new FargateProfileConstraints, "FargateProfiles", ...Object.values(props.fargateProfiles as any));
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

