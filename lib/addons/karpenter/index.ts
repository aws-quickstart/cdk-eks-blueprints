import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import merge from 'ts-deepmerge';
import { ClusterInfo } from '../../spi';
import { conflictsWith, createNamespace, createServiceAccount, dependable, setPath, } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { KarpenterControllerPolicy } from './iam';
import { CfnOutput } from 'aws-cdk-lib';
import * as md5 from 'ts-md5';
import * as semver from 'semver';
import * as assert from "assert";


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
    weight?: number
}

const KARPENTER = 'karpenter';
const RELEASE = 'blueprints-addon-karpenter';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: '0.16.3',
    chart: KARPENTER,
    release: RELEASE,
    repository: 'https://charts.karpenter.sh',
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

    @dependable('VpcCniAddOn')
    @conflictsWith('ClusterAutoScalerAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const endpoint = clusterInfo.cluster.clusterEndpoint;
        const name = clusterInfo.cluster.clusterName;
        const cluster = clusterInfo.cluster;
        const stackName = clusterInfo.cluster.stack.stackName;
        const region = clusterInfo.cluster.stack.region;
        let values = this.options.values ?? {};

        const requirements = this.options.requirements || [];
        const subnetTags = this.options.subnetTags || {};
        const sgTags = this.options.securityGroupTags || {};
        const taints = this.options.taints || [];
        const amiFamily = this.options.amiFamily;
        const ttlSecondsAfterEmpty = this.options.ttlSecondsAfterEmpty || null;
        const ttlSecondsUntilExpired = this.options.ttlSecondsUntilExpired || null;
        const weight = this.options.weight || null;
        
        // Weight only available with v0.16.0 and later
        if (semver.lt(this.options.version!, '0.16.0')){
            assert(!weight, 'The prop weight is only supported on versions v0.16.0 and later.');
        }

        let consolidation;
        // Consolidation only available with v0.15.0 and later
        if (semver.lt(this.options.version!, '0.15.0')){
            assert(!this.options.consolidation, 'The prop consolidation is only supported on versions v0.15.0 and later.');
        } else {
            consolidation = this.options.consolidation || { enabled: false }; 
            // You cannot enable consolidation and ttlSecondsAfterEmpty values
            assert( !(consolidation.enabled && ttlSecondsAfterEmpty) , 'Consolidation and ttlSecondsAfterEmpty must be mutually exclusive.');
        }

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
        new CfnOutput(clusterInfo.cluster.stack, 'Karpenter Instance Profile name', { 
            value: karpenterInstanceProfile ? karpenterInstanceProfile.instanceProfileName! : "none",
            description: "Karpenter add-on Instance Profile name" 
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ['system:bootstrapper', 'system:nodes'],
            username: 'system:node:{{EC2PrivateDNSName}}'
        });

        // Create Namespace
        const ns = createNamespace(KARPENTER, cluster, true, true);
        const karpenterPolicyDocument = iam.PolicyDocument.fromJson(KarpenterControllerPolicy);
        const sa = createServiceAccount(cluster, RELEASE, KARPENTER, karpenterPolicyDocument);
        sa.node.addDependency(ns);

        // Add helm chart
        setPath(values, "clusterEndpoint", endpoint);
        setPath(values, "clusterName", name);
        setPath(values, "aws.defaultInstanceProfile", karpenterInstanceProfile.instanceProfileName);
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
     * @returns
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
}