import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import merge from 'ts-deepmerge';
import { ClusterInfo } from '../../spi';
import { conflictsWith, createNamespace, createServiceAccount, dependable, setPath, } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { KarpenterControllerPolicy } from './iam';
import * as md5 from 'ts-md5';

/**
 * Configuration options for the add-on
 */
interface KarpenterAddOnProps extends HelmAddOnUserProps {
    /**
     * Specs for a Provisioner (Optional) - If not provided, the add-on will
     * deploy a Provisioner with default values.
     */
    provisionerSpecs?: {
        'node.kubernetes.io/instance-type'?: string[],
        'topology.kubernetes.io/zone'?: string[],
        'kubernetes.io/arch'?: string[],
        'karpenter.sh/capacity-type'?: string[],
    }

    taints?: [{
        key: string,
        value: string,
        effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute",
    }]

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
}

const KARPENTER = 'karpenter';
const RELEASE = 'blueprints-addon-karpenter';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: '0.13.2',
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

        const provisionerSpecs = this.options.provisionerSpecs || {};
        const subnetTags = this.options.subnetTags || {};
        const sgTags = this.options.securityGroupTags || {};
        const taints = this.options.taints || [];
        const amiFamily = this.options.amiFamily;

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
                    requirements: this.convertToSpec(provisionerSpecs),
                    taints: taints,
                    provider: {
                        amiFamily: amiFamily,
                        subnetSelector: subnetTags,
                        securityGroupSelector: sgTags,
                    },
                    ttlSecondsAfterEmpty: 30,
                },
            });
            provisioner.node.addDependency(karpenterChart);
        }

        return Promise.resolve(karpenterChart);
    }

    /**
     * Helper function to convert a key-pair values of provisioner spec configurations
     * To appropriate json format for addManifest function
     * @param specs
     * @returns
     * */
    protected convertToSpec(specs: { [key: string]: string[]; }): any[] {
        const newSpecs = [];
        for (const key in specs){
            const value = specs[key];
            const requirement = {
                "key": key,
                "operator": "In",
                "values": value
            };
            newSpecs.push(requirement);
        }
        return newSpecs;
    }
}