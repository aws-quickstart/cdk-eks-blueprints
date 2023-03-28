import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import merge from 'ts-deepmerge';
import { ClusterInfo } from '../../spi';
import { conflictsWith, createNamespace, createServiceAccount, setPath, } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { KarpenterControllerPolicy } from './iam';
import { CfnOutput, Duration, Names } from 'aws-cdk-lib';
import * as md5 from 'ts-md5';
import * as semver from 'semver';
import * as assert from "assert";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Cluster } from 'aws-cdk-lib/aws-eks';


/**
 * Configuration options for the add-on
 */
interface KarpenterAddOnProps extends HelmAddOnUserProps {
    /**
     * Requirement properties for a Provisioner (Optional) - If not provided, the add-on will
     * deploy a Provisioner with default values.
     */
    requirements?: {
        key: string,
        op: 'In' | 'NotIn' ,
        vals: string[],
    }[]

    taints?: {
        key: string,
        value: string,
        effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute",
    }[]

    /**
     * Tags needed for subnets - Subnet tags and security group tags are required for the provisioner to be created
     */
    subnetTags?: {
        [key: string]: string
    }

    /**
     * Tags needed for security groups - Subnet tags and security group tags are required for the provisioner to be created
     */
    securityGroupTags?: {
        [key: string]: string
    }

    /**
     * AMI Family: If provided, Karpenter will automatically query the appropriate EKS optimized AMI via AWS Systems Manager
     */
    amiFamily?: "AL2" | "Bottlerocket" | "Ubuntu"

    /**
     * Enables consolidation which attempts to reduce cluster cost by both removing un-needed nodes and down-sizing those that can't be removed.  
     * Mutually exclusive with the ttlSecondsAfterEmpty parameter.
     * Only applicable for v0.15.0 or later.
     */
    consolidation?: {
        enabled: boolean,
    }

    /**
     * If omitted, the feature is disabled and nodes will never expire.  
     * If set to less time than it requires for a node to become ready, 
     * the node may expire before any pods successfully start.
     */
    ttlSecondsUntilExpired?: number,

    /**
     * How many seconds Karpenter will wailt until it deletes empty/unnecessary instances (in seconds).
     * Mutually exclusive with the consolidation parameter.
     */
    ttlSecondsAfterEmpty?: number,

    /**
     * Priority given to the provisioner when the scheduler considers which provisioner
     * to select. Higher weights indicate higher priority when comparing provisioners.
     */
    weight?: number,

    /**
     * Flag for enabling Karpenter's native interruption handling 
     * Only applicable for v0.19.0 and later
     */
    interruptionHandling?: boolean,

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
    };
}

const KARPENTER = 'karpenter';
const RELEASE = 'blueprints-addon-karpenter';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: 'v0.25.0',
    chart: KARPENTER,
    release: KARPENTER,
    repository: 'oci://public.ecr.aws/karpenter/karpenter',
};

/**
 * Implementation of the Karpenter add-on
 */
export class KarpenterAddOn extends HelmAddOn {

    readonly options: KarpenterAddOnProps;

    constructor(props?: KarpenterAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props;
    }

    @conflictsWith('ClusterAutoScalerAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const endpoint = cluster.clusterEndpoint;
        const name = cluster.clusterName;
        
        const stackName = cluster.stack.stackName;
        const region = cluster.stack.region;

        let values = this.options.values ?? {};
        const version = this.options.version!;
        const requirements = this.options.requirements || [];
        const subnetTags = this.options.subnetTags || {};
        const sgTags = this.options.securityGroupTags || {};
        const taints = this.options.taints || [];
        const amiFamily = this.options.amiFamily;
        const ttlSecondsAfterEmpty = this.options.ttlSecondsAfterEmpty || null;
        const ttlSecondsUntilExpired = this.options.ttlSecondsUntilExpired || null;
        const weight = this.options.weight || null;
        const consol = this.options.consolidation || null;
        const repo = this.options.repository!;
        const interruption = this.options.interruptionHandling || false;
        const limits = this.options.limits || null;
        
        // Various checks for version errors
        const consolidation = this.versionFeatureChecksForError(clusterInfo, version, weight, consol, repo, ttlSecondsAfterEmpty, interruption);

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

        // Support for Native spot interruption only available on v0.19.0 or later
        if (semver.gte(version, 'v0.19.0') && interruption){
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
        const ns = createNamespace(KARPENTER, cluster, true, true);
        const sa = createServiceAccount(cluster, RELEASE, KARPENTER, karpenterPolicyDocument);
        sa.node.addDependency(ns);

        // Add helm chart
        if (semver.gte(this.options.version!, '0.19.0')){
            setPath(values, "settings.aws", {
                clusterEndpoint: endpoint,
                clusterName: name,
                defaultInstanceProfile: karpenterInstanceProfile.instanceProfileName,
                interruptionQueueName: stackName
            });
        } else {
            setPath(values, "clusterEndpoint", endpoint);
            setPath(values, "clusterName", name);
            setPath(values, "aws.defaultInstanceProfile", karpenterInstanceProfile.instanceProfileName);
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

        // (Optional) default provisioner
        if ((Object.keys(subnetTags).length > 0) && (Object.keys(sgTags).length > 0)){
            const provisioner = cluster.addManifest('default-provisioner', {
                apiVersion: 'karpenter.sh/v1alpha5',
                kind: 'Provisioner',
                metadata: { name: 'default' },
                spec: {
                    consolidation: consolidation,
                    requirements: this.convert(requirements),
                    taints: taints,
                    limits: limits,
                    provider: {
                        amiFamily: amiFamily,
                        subnetSelector: subnetTags,
                        securityGroupSelector: sgTags,
                    },
                    ttlSecondsUntilExpired: ttlSecondsUntilExpired,
                    ttlSecondsAfterEmpty: ttlSecondsAfterEmpty,
                    weight: weight,
                },
            });
            provisioner.node.addDependency(karpenterChart);
        }

        return Promise.resolve(karpenterChart);
    }

    /**
     * Helper function to convert a key-pair values (with an operator) 
     * of spec configurations to appropriate json format for addManifest function
     * @param reqs
     * @returns newReqs
     * */
    protected convert(reqs: {key: string, op: string, vals: string[]}[]): any[] {
        const newReqs = [];
        for (let req of reqs){
            const key = req['key'];
            const op = req['op'];
            const val = req['vals'];
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
     * @param version version of the add-on
     * @param weight weight setting
     * @param consol consolidation setting
     * @param repo repository url of the helm chart
     * @param ttlSecondsAfterEmpty ttlSecondsAfterEmpty setting
     * @returns consolidation
     */
    private versionFeatureChecksForError(clusterInfo: ClusterInfo, version: string, weight: any, consol: any, repo: string, ttlSecondsAfterEmpty: any, interruption: boolean): any {
        
        // Consolidation only available with v0.15.0 and later
        let consolidation;
        if (semver.lt(version, '0.15.0')){
            assert(!consol, 'The prop consolidation is only supported on versions v0.15.0 and later.');
        } else {
            consolidation = consol || { enabled: false }; 
            // You cannot enable consolidation and ttlSecondsAfterEmpty values
            assert( !(consolidation.enabled && ttlSecondsAfterEmpty) , 'Consolidation and ttlSecondsAfterEmpty must be mutually exclusive.');
        }

        // Weight only available with v0.16.0 and later
        if (semver.lt(version, '0.16.0')){
            assert(!weight, 'The prop weight is only supported on versions v0.16.0 and later.');
        }
        
        // Registry changes with v0.17.0 and later
        if (semver.gte(version, '0.17.0')){
            assert(repo === 'oci://public.ecr.aws/karpenter/karpenter', 'Please provide the OCI repository.');
        } else {
            assert(repo === 'https://charts.karpenter.sh', 'Please provide the older Karpenter repository url.');
        }

        // Interruption handling only available with v0.19.0 and later
        // Conversely, we should block Node Termination Handler usage once Karpenter is leveraged
        if (semver.lt(version, '0.19.0')){
            assert(!interruption, 'Interruption handling is only supported on versions v0.19.0 and later.');
        } else {
            assert(!clusterInfo.getProvisionedAddOn('AwsNodeTerminationHandlerAddOn'), 'Karpenter supports native interruption handling, so Node Termination Handler will not be necessary.');
        }

        return consolidation;
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
}