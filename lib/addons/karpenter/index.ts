import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import merge from 'ts-deepmerge';
import { ClusterInfo, Values, Taint, reqValues } from '../../spi';
import * as utils from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { KarpenterControllerPolicy } from './iam';
import { CfnOutput, Duration, Names } from 'aws-cdk-lib';
import * as md5 from 'ts-md5';
import * as semver from 'semver';
import * as assert from "assert";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

type sec = `${number}s`;
type min = `${number}m`;
type hour = `${number}h`;

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.of('1.29'), '0.34.0'],
    [KubernetesVersion.V1_28, '0.31.0'],
    [KubernetesVersion.V1_27, '0.28.0'],
    [KubernetesVersion.V1_26, '0.28.0'],
    [KubernetesVersion.V1_25, '0.25.0'],
    [KubernetesVersion.V1_24, '0.21.0'],
    [KubernetesVersion.V1_23, '0.21.0'],
]);

export interface BlockDeviceMapping {
    deviceName?: string;
    virtualName?: string;
    ebs?: EbsVolumeMapping;
    noDevice?: string;
}
  
export interface EbsVolumeMapping {
    deleteOnTermination?: boolean;
    iops?: number;
    snapshotId?: string;
    volumeSize?: string;
    volumeType?: EbsDeviceVolumeType;
    kmsKeyId?: string;
    throughput?: number;
    outpostArn?: string;
    encrypted?: boolean;
}

/**
 * Configuration options for the add-on
 */
export interface KarpenterAddOnProps extends HelmAddOnUserProps {
    /**
     * This is the top level nodepool specification. Nodepools launch nodes in response to pods that are unschedulable. 
     * A single nodepool is capable of managing a diverse set of nodes. 
     * Node properties are determined from a combination of nodepool and pod scheduling constraints.
     */
    NodePoolSpec?: {
        /**
         * Labels applied to all nodes
         */
        labels?: Values,

        /**
         * Annotations applied to all nodes
         */
        annotations?: Values,

        /**
         * Taints for the provisioned nodes - Taints may prevent pods from scheduling if they are not tolerated by the pod.
         */
        taints?: Taint[],

        /**
         * Provisioned nodes will have these taints, but pods do not need to tolerate these taints to be provisioned by this\
         * provisioner. These taints are expected to be temporary and some other entity (e.g. a DaemonSet) is responsible for
         * removing the taint after it has finished initializing the node.
         */
        startupTaints?: Taint[],

        /**
         * Requirement properties for a Provisioner (Optional) - If not provided, the add-on will
         * deploy a Provisioner with default values.
         */
        requirements: reqValues,

        /**
         * Enables consolidation which attempts to reduce cluster cost by both removing un-needed nodes and down-sizing those that can't be removed.  
         * Mutually exclusive with the ttlSecondsAfterEmpty parameter.
         * 
         * Replaced with disruption.consolidationPolicy for versions v0.32.x and later
         */
        consolidation?: {
            enabled: boolean,
        }

        /**
         * If omitted, the feature is disabled and nodes will never expire.  
         * If set to less time than it requires for a node to become ready, 
         * the node may expire before any pods successfully start.
         * 
         * Replaced with disruption.expireAfter for versions v0.32.x and later
         */
        ttlSecondsUntilExpired?: number,

        /**
         * How many seconds Karpenter will wailt until it deletes empty/unnecessary instances (in seconds).
         * Mutually exclusive with the consolidation parameter.
         * 
         * Replaced with disruption.consolidationPolicy and disruption.consolidateAfter for versions v0.32.x and later
         */
        ttlSecondsAfterEmpty?: number,

        /** 
         * Disruption section which describes the ways in which Karpenter can disrupt and replace Nodes
         * Configuration in this section constrains how aggressive Karpenter can be with performing operations
         * like rolling Nodes due to them hitting their maximum lifetime (expiry) or scaling down nodes to reduce cluster cost
         * Only applicable for versions v0.32 or later
         * 
         * @param consolidationPolicy consolidation policy - will default to WhenUnderutilized if not provided
         * @param consolidateAfter How long Karpenter waits to consolidate nodes - cannot be set when the policy is WhenUnderutilized
         * @param expireAfter How long Karpenter waits to expire nodes
         */
        disruption?: {
            consolidationPolicy?: "WhenUnderutilized" | "WhenEmpty",
            consolidateAfter?: sec | min | hour,
            expireAfter?:  "Never" | sec | min | hour
        },

        /**
         * Limits define a set of bounds for provisioning capacity.
         * Resource limits constrain the total size of the cluster.
         * Limits prevent Karpenter from creating new instances once the limit is exceeded.
         */
        limits?: {
            resources?: {
            cpu?: number;
            memory?: string;
            /**
             * Extended resources are fully-qualified resource names outside the kubernetes.io domain.
             * They allow cluster operators to advertise and users to consume the non-Kubernetes-built-in
             * resources such as hardware devices GPUs, RDMAs, SR-IOVs...
             * e.g nvidia.com/gpu, amd.com/gpu, etc...
             */
            [k: string]: unknown;
            };
        },

        /**
         * Priority given to the provisioner when the scheduler considers which provisioner
         * to select. Higher weights indicate higher priority when comparing provisioners.
         */
        weight?: number,
    }
    
    /**
     * This is the top level spec for the AWS Karpenter Provider
     * It contains configuration necessary to launch instances in AWS. 
     */
    EC2NodeClassSpec?: {
        /**
         * Tags needed for subnets - Subnet tags and security group tags are required for the provisioner to be created
         */
        subnetTags: Values,

        /**
         * Tags needed for security groups - Subnet tags and security group tags are required for the provisioner to be created
         */
        securityGroupTags: Values,
        
        /**
         * AMI Selector
         */
        amiSelector?: Values,
        
        /**
         * AMI Family: required for v0.32.0 and above, optional otherwise
         * Karpenter will automatically query the appropriate EKS optimized AMI via AWS Systems Manager
         */
        amiFamily?: "AL2" | "Bottlerocket" | "Ubuntu" | "Windows2019" | "Windows2022"

        userData?: string,

        role?: string,

        instanceProfile?: string,

        /**
         * Tags adds tags to all resources created, including EC2 Instances, EBS volumes and Launch Templates.
         * Karpenter allows overrides of the default "Name" tag but does not allow overrides to restricted domains 
         * (such as "karpenter.sh", "karpenter.k8s.aws", and "kubernetes.io/cluster").
         * This ensures that Karpenter is able to correctly auto-discover machines that it owns.
         */
        tags?: Values;

        /**
         * Control the exposure of Instance Metadata service using this configuration
         */
        metadataOptions?: Values;

        /**
         * BlockDeviceMappings allows you to specify the block device mappings for the instances.
         * This is a list of mappings, where each mapping consists of a device name and an EBS configuration.
         * If you leave this blank, it will use the Karpenter default.
         */
        blockDeviceMappings?: BlockDeviceMapping[];

        /**
         * Detailed monitoring on EC2
         */
        detailedMonitoring?: boolean
    }

    /**
     * Flag for enabling Karpenter's native interruption handling 
     */
    interruptionHandling?: boolean,
}

const KARPENTER = 'karpenter';
const RELEASE = 'blueprints-addon-karpenter';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: 'v0.34.1',
    chart: KARPENTER,
    release: KARPENTER,
    repository: 'oci://public.ecr.aws/karpenter/karpenter',
};

/**
 * Implementation of the Karpenter add-on
 */
@utils.supportsALL
export class KarpenterAddOn extends HelmAddOn {

    readonly options: KarpenterAddOnProps;

    constructor(props?: KarpenterAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props;
    }

    @utils.conflictsWith('ClusterAutoScalerAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        assert(clusterInfo.cluster instanceof Cluster, "KarpenterAddOn cannot be used with imported clusters as it requires changes to the cluster authentication.");
        const cluster : Cluster = clusterInfo.cluster;
        const endpoint = cluster.clusterEndpoint;
        const name = cluster.clusterName;
        
        const stackName = cluster.stack.stackName;
        const region = cluster.stack.region;

        let values = this.options.values ?? {};
        const version = this.options.version!;

        const interruption = this.options.interruptionHandling || false;

        // NodePool variables
        const labels = this.options.NodePoolSpec?.labels || {};
        const annotations = this.options.NodePoolSpec?.annotations || {};
        const taints = this.options.NodePoolSpec?.taints || [];
        const startupTaints = this.options.NodePoolSpec?.startupTaints || [];
        const requirements = this.options.NodePoolSpec?.requirements || [];
        const consol = this.options.NodePoolSpec?.consolidation || null;
        const ttlSecondsAfterEmpty = this.options.NodePoolSpec?.ttlSecondsAfterEmpty || null;
        const ttlSecondsUntilExpired = this.options.NodePoolSpec?.ttlSecondsUntilExpired || null;
        const disruption = this.options.NodePoolSpec?.disruption || null;
        const limits = this.options.NodePoolSpec?.limits || null;
        const weight = this.options.NodePoolSpec?.weight || null;

        // NodeClass variables
        const subnetTags = this.options.EC2NodeClassSpec?.subnetTags;
        const sgTags = this.options.EC2NodeClassSpec?.securityGroupTags;
        const amiFamily = this.options.EC2NodeClassSpec?.amiFamily;
        const amiSelector = this.options.EC2NodeClassSpec?.amiSelector || {};
        const userData = this.options.EC2NodeClassSpec?.userData || "";
        const role = this.options.EC2NodeClassSpec?.role; 
        const instanceProf = this.options.EC2NodeClassSpec?.instanceProfile; 
        const tags = this.options.EC2NodeClassSpec?.tags || {};
        const metadataOptions = this.options.EC2NodeClassSpec?.metadataOptions || {
            httpEndpoint: "enabled",
            httpProtocolIPv6: "disabled",
            httpPutResponseHopLimit: 2,
            httpTokens: "required"
        };
        const blockDeviceMappings = this.options.EC2NodeClassSpec?.blockDeviceMappings || [];
        const detailedMonitoring = this.options.EC2NodeClassSpec?.detailedMonitoring || false;
        
        // Check Kubernetes and Karpenter version compatibility for warning
        this.isCompatible(version, clusterInfo.version);

        // Version feature checks for errors
        this.versionFeatureChecksForError(clusterInfo, version, disruption, consol, ttlSecondsAfterEmpty, ttlSecondsUntilExpired);

        // Set up the node role and instance profile
        const [karpenterNodeRole, karpenterInstanceProfile] = this.setUpNodeRole(cluster, stackName, region);

        // Create the controller policy
        const karpenterPolicyDocument = iam.PolicyDocument.fromJson(KarpenterControllerPolicy);
        karpenterPolicyDocument.addStatements(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "iam:PassRole",
            ],
            resources: [`${karpenterNodeRole.roleArn}`]
        }));

        // Support for Native spot interruption
        if (interruption){
            // Create Interruption Queue
            const queue = new sqs.Queue(cluster.stack, 'karpenter-queue', {
                queueName: stackName,
                retentionPeriod: Duration.seconds(300),
            });
            queue.addToResourcePolicy(new iam.PolicyStatement({
                sid: 'EC2InterruptionPolicy',
                effect: iam.Effect.ALLOW,
                principals: [
                    new iam.ServicePrincipal('sqs.amazonaws.com'),
                    new iam.ServicePrincipal('events.amazonaws.com'),
                ],
                actions: [
                    "sqs:SendMessage"
                ],
                resources: [`${queue.queueArn}`]
            }));

            // Add Interruption Rules
            new Rule(cluster.stack, 'schedule-change-rule', {
                eventPattern: {
                    source: ["aws.health"],
                    detailType: ['AWS Health Event']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'spot-interruption-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['EC2 Spot Instance Interruption Warning']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'rebalance-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['EC2 Instance Rebalance Recommendation']
                },
            }).addTarget(new SqsQueue(queue));

            new Rule(cluster.stack, 'inst-state-change-rule', {
                eventPattern: {
                    source: ["aws.ec2"],
                    detailType: ['C2 Instance State-change Notification']
                },
            }).addTarget(new SqsQueue(queue));

            // Add policy to the node role to allow access to the Interruption Queue
            const interruptionQueueStatement = new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "sqs:DeleteMessage",
                    "sqs:GetQueueUrl",
                    "sqs:GetQueueAttributes",
                    "sqs:ReceiveMessage"
                ],
                resources: [`${queue.queueArn}`]
            });
            karpenterPolicyDocument.addStatements(interruptionQueueStatement);
        }

        // Create Namespace
        const ns = utils.createNamespace(KARPENTER, cluster, true, true);
        const sa = utils.createServiceAccount(cluster, RELEASE, KARPENTER, karpenterPolicyDocument);
        sa.node.addDependency(ns);

        // Create global helm values based on v1beta1 migration as shown below:
        // https://karpenter.sh/v0.32/upgrading/v1beta1-migration/#helm-values
        let globalSettings = {
            clusterName: name,
            clusterEndpoint: endpoint
        };

        if (semver.lt(version, '0.32.0')){
            globalSettings = merge(globalSettings, { 
                defaultInstanceProfile: karpenterInstanceProfile.instanceProfileName,
                interruptionQueueName: interruption ? stackName : "" 
            });
        } else {
            globalSettings = merge(globalSettings, { 
                interruptionQueue: interruption ? stackName : "" 
            });
        }
        
        if (semver.lt(version, '0.32.0')){
            utils.setPath(values, "settings.aws", merge(globalSettings, values?.settings?.aws ?? {}));
        } else {
            utils.setPath(values, "settings", merge(globalSettings, values?.settings ?? {}));
        }

        const saValues = {
            serviceAccount: {
                create: false,
                name: RELEASE,
                annotations: {
                    "eks.amazonaws.com/role-arn": sa.role.roleArn,
                }
            }
        };

        values = merge(values, saValues);
        const karpenterChart = this.addHelmChart(clusterInfo, values, false, true);

        karpenterChart.node.addDependency(ns);

        // Deploy Provisioner (Alpha) or NodePool (Beta) CRD based on the Karpenter Version
        let pool;
        if (semver.gte(version, '0.32.0')){
            pool = {
                apiVersion: 'karpenter.sh/v1beta1',
                kind: 'NodePool',
                metadata: { name: 'default-nodepool' },
                spec: {
                    template: {
                        labels: labels,
                        annotations: annotations,
                        spec: {
                            nodeClassRef: {
                                name: "default-ec2nodeclass"
                            },
                            taints: taints,
                            startupTaints: startupTaints,
                            requirements: this.convert(requirements),
                        }
                    },
                    disruption: disruption,
                    limits: limits,
                    weight: weight,
                },
            };
        } else {
            pool = {
                apiVersion: 'karpenter.sh/v1alpha5',
                kind: 'Provisioner',
                metadata: { name: 'default-provisioner' },
                spec: {
                    providerRef: {
                        name: "default-nodetemplate"
                    },
                    taints: taints,
                    startupTaints: startupTaints,
                    labels: labels,
                    annotations: annotations,
                    requirements: this.convert(requirements),
                    limits: limits,
                    consolidation: consol,
                    ttlSecondsUntilExpired: ttlSecondsUntilExpired,
                    ttlSecondsAfterEmpty: ttlSecondsAfterEmpty,
                    weight: weight,
                },
            };
        }
        const poolManifest = cluster.addManifest('default-pool', pool);
        poolManifest.node.addDependency(karpenterChart);

        // Deploy AWSNodeTemplate (Alpha) or EC2NodeClass (Beta) CRD based on the Karpenter Version
        // if ((Object.keys(subnetTags).length > 0) && (Object.keys(sgTags).length > 0)){
        // }
        
        let ec2Node;
        if (semver.gte(version, '0.32.0')){
            ec2Node = {
                apiVersion: "karpenter.k8s.aws/v1beta1",
                kind: "EC2NodeClass",
                metadata: {
                    name: "default-ec2nodeclass"
                },
                spec: {
                    amiFamily: amiFamily,
                    subnetSelectorTerms: subnetTags,
                    securityGroupSelectorTerms: sgTags,
                    amiSelectorTerms: amiSelector,
                    userData: userData,
                    tags: tags,
                    metadataOptions: metadataOptions,
                    blockDeviceMappings: blockDeviceMappings,
                    detailedMonitoring: detailedMonitoring,
                },
            }
        } else {
            ec2Node = {
                apiVersion: "karpenter.k8s.aws/v1alpha1",
                kind: "AWSNodeTemplate",
                metadata: {
                    name: "default-nodetemplate"
                },
                spec: {
                    subnetSelector: subnetTags,
                    securityGroupSelector: sgTags,
                    // instanceProfile: ,
                    amiFamily: amiFamily,
                    amiSelector: amiSelector,
                    userData: userData,
                    tags: tags,
                    metadataOptions: metadataOptions,
                    blockDeviceMappings: blockDeviceMappings,
                    detailedMonitoring: detailedMonitoring,
                },
            }
        }
        const nodeManifest = cluster.addManifest('default-node-template', ec2Node);
        nodeManifest.node.addDependency(poolManifest);

        return Promise.resolve(karpenterChart);
    }

    /**
     * Helper function to convert a key-pair values (with an operator) 
     * of spec configurations to appropriate json format for addManifest function
     * @param reqs
     * @returns newReqs
     * */
    protected convert(reqs: {key: string, operator: string, values: string[]}[]): any[] {
        const newReqs = [];
        for (let req of reqs){
            const key = req['key'];
            const op = req['operator'];
            const val = req['values'];
            const requirement = {
                "key": key,
                "operator": op,
                "values": val
            };
            newReqs.push(requirement);
        }
        return newReqs;
    }

    /**
     * Helper function to ensure right features are added as part of the configuration
     * for the right version of the add-on
     * @param clusterInfo 
     * @param version version of the add-on
     * @param disruption disruption feature available with the Beta CRDs
     * @param consolidation consolidation setting available with the Alpha CRDs
     * @param ttlSecondsAfterEmpty ttlSecondsAfterEmpty setting
     * @param ttlSecondsUntilExpired ttlSecondsUntilExpired setting
     * @returns
     */
    private versionFeatureChecksForError(clusterInfo: ClusterInfo, version: string, disruption: any, consolidation: any, ttlSecondsAfterEmpty: any, ttlSecondsUntilExpired: any): void {
        
        // version check errors for v0.32.0 and up (beta CRDs)
        if (semver.gte(version, '0.32.0')){
            // Consolidation features don't exist in beta CRDs
            assert(!consolidation && !ttlSecondsAfterEmpty && !ttlSecondsUntilExpired, 'Consolidation features are only available for previous versions of Karpenter.');
            
            // consolidateAfter cannot be set if policy is set to WhenUnderutilized
            if (disruption){
                assert(disruption["consolidationPolicy"]=="WhenUnderutilized" && !disruption["consolidateAfter"], 'You cannot set consolidateAfter value if the consolidation policy is set to Underutilized.');
            }
        }

        // version check errors for v0.31.x and down (alpha CRDs)
        // Includes 
        if (semver.lt(version, '0.32.0')){
            if (consolidation){
                assert(!(consolidation.enabled && ttlSecondsAfterEmpty) , 'Consolidation and ttlSecondsAfterEmpty must be mutually exclusive.');
            }
            assert(!disruption, 'Disruption configuration is only supported on versions v0.32.0 and later.');
        }
        
        // We should block Node Termination Handler usage once Karpenter is leveraged
         assert(!clusterInfo.getProvisionedAddOn('AwsNodeTerminationHandlerAddOn'), 'Karpenter supports native interruption handling, so Node Termination Handler will not be necessary.');

    }

    /**
     * Helper function to set up the Karpenter Node Role and Instance Profile
     * Outputs to CloudFormation and map the role to the aws-auth ConfigMap
     * @param cluster EKS Cluster
     * @param stackName Name of the stack
     * @param region Region of the stack
     * @returns [karpenterNodeRole, karpenterInstanceProfile]
     */
    private setUpNodeRole(cluster: Cluster, stackName: string, region: string): [iam.Role, iam.CfnInstanceProfile] {
        // Set up Node Role
        const karpenterNodeRole = new iam.Role(cluster, 'karpenter-node-role', {
            assumedBy: new iam.ServicePrincipal(`ec2.${cluster.stack.urlSuffix}`),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
            //roleName: `KarpenterNodeRole-${name}` // let role name to be generated as unique
        });

        // Set up Instance Profile
        const instanceProfileName = md5.Md5.hashStr(stackName+region);
        const karpenterInstanceProfile = new iam.CfnInstanceProfile(cluster, 'karpenter-instance-profile', {
            roles: [karpenterNodeRole.roleName],
            instanceProfileName: `KarpenterNodeInstanceProfile-${instanceProfileName}`,
            path: '/'
        });
        
        const clusterId = Names.uniqueId(cluster);

        //Cfn output for Node Role in case of needing to add additional policies
        new CfnOutput(cluster.stack, 'Karpenter Instance Node Role', {
            value: karpenterNodeRole.roleName,
            description: "Karpenter add-on Node Role name",
            exportName: clusterId+"KarpenterNodeRoleName",
        });
        //Cfn output for Instance Profile for creating additional provisioners
        new CfnOutput(cluster.stack, 'Karpenter Instance Profile name', { 
            value: karpenterInstanceProfile ? karpenterInstanceProfile.instanceProfileName! : "none",
            description: "Karpenter add-on Instance Profile name",
            exportName: clusterId+"KarpenterInstanceProfileName", 
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ['system:bootstrapper', 'system:nodes'],
            username: 'system:node:{{EC2PrivateDNSName}}'
        });

        return [karpenterNodeRole, karpenterInstanceProfile];
    }

    /**
     * Helper function to check whether:
     * 1. Supported Karpenter versions are implemented, and
     * 2. Supported Kubernetes versions are deployed on the cluster to use Karpenter
     * It will reject the addon if the cluster uses deprecated Kubernetes version, and
     * Warn users about issues if incompatible Karpenter version is used for a particular cluster
     * given its Kubernetes version
     * @param karpenterVersion Karpenter version to be deployed
     * @param kubeVersion Cluster's Kubernetes version
     */
    private isCompatible(karpenterVersion: string, kubeVersion: KubernetesVersion): void {
        assert(versionMap.has(kubeVersion), 'Please upgrade your EKS Kubernetes version to start using Karpenter.');
        assert(semver.gte(karpenterVersion, '0.21.0'), 'Please use Karpenter version 0.21.0 or above.');
        const compatibleVersion = versionMap.get(kubeVersion) as string;
        if (semver.gt(compatibleVersion, karpenterVersion)) {
            console.warn(`Please use minimum Karpenter version for this Kubernetes Version: ${compatibleVersion}, otherwise you will run into compatibility issues.`);
        }   
    }
}