import { Construct } from "constructs";
import { CfnJson } from "aws-cdk-lib";
import * as iam from 'aws-cdk-lib/aws-iam';
import { ClusterInfo } from '../../spi';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { createNamespace, setPath, conflictsWith, tagSubnets, tagSecurityGroup } from '../../utils';
import { KarpenterControllerPolicy } from './iam';

/**
 * Configuration options for the add-on
 */
interface KarpenterAddOnProps extends HelmAddOnUserProps {
    /**
     * Specs for a Provisioner (Optional) - If not provided, the add-on will
     * deploy a Provisioner with default values.
     */
    ProvisionerSpecs?: { 
        'node.kubernetes.io/instance-type'?: string[],
        'topology.kubernetes.io/zone'?: string[],
        'kubernetes.io/arch'?: string[],
        'karpenter.sh/capacity-type'?: string[],
    }

    /**
     * Tags needed for subnets - Subnet tags and security group tags are required for the provisioner to be created
     */
    SubnetTags?: { 
        [key: string]: string
    }

    /**
     * Tags needed for security groups - Subnet tags and security group tags are required for the provisioner to be created
     */
    SecurityGroupTags?: { 
        [key: string]: string
    }
}

const KARPENTER = 'karpenter';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: '0.8.2',
    chart: KARPENTER,
    release: "blueprints-addon-karpenter",
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

    @conflictsWith('ClusterAutoScalerAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const endpoint = clusterInfo.cluster.clusterEndpoint;
        const name = clusterInfo.cluster.clusterName;
        const cluster = clusterInfo.cluster;
        const values = { ...this.props.values ?? {} };

        const provisionerSpecs = this.options.ProvisionerSpecs || {};
        const subnetTags = this.options.SubnetTags || {};
        const sgTags = this.options.SecurityGroupTags || {};

        // Tag VPC Subnets
        if (subnetTags){
            Object.entries(subnetTags).forEach(
                ([key,value]) => {
                    tagSubnets(cluster.stack, cluster.vpc.privateSubnets, key, value);
            });
        }
        
        // Tag VPC Security Group
        if (sgTags){
            Object.entries(sgTags).forEach(
                ([key,value]) => {
                    tagSecurityGroup(cluster.stack, cluster.clusterSecurityGroupId, key,value);
            });
        }
        
        const conditions = new CfnJson(cluster, "ConditionPlainJson", {
            value: {
                [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]: "sts.amazonaws.com",
                [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: `system:serviceaccount:karpenter:karpenter`,
            },
        });

        const principal = new iam.OpenIdConnectPrincipal(
            cluster.openIdConnectProvider).withConditions({
                StringEquals: conditions,
            });

        const karpenterPolicy = new iam.Policy(cluster, 'karpenter-policy', {
            document: iam.PolicyDocument.fromJson(KarpenterControllerPolicy)
        });
        
        const karpenterControllerRole = new iam.Role(cluster,
            "karpenterControllerRole",
            {
              assumedBy: principal,
              description: `This is the karpenterControllerRole role Karpenter uses to allocate compute for ${name}`,
              roleName: `${name}-karpenter`,
            }
        );
        karpenterControllerRole.attachInlinePolicy(karpenterPolicy);
      
        // Set up Node Role
        const karpenterNodeRole = new iam.Role(cluster, 'karpenter-node-role', {
            assumedBy: new iam.ServicePrincipal(`ec2.${cluster.stack.urlSuffix}`),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
            roleName: `KarpenterNodeRole-${name}`
        });

        // Set up Instance Profile
        const karpenterInstanceProfile = new iam.CfnInstanceProfile(cluster, 'karpenter-instance-profile', {
            roles: [karpenterNodeRole.roleName],
            instanceProfileName: `KarpenterNodeInstanceProfile-${name}`,
            path: '/'
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ['system:bootstrapper', 'system:nodes'],
            username: 'system:node:{{EC2PrivateDNSName}}'
        });

        // Create Namespace
        const ns = createNamespace(KARPENTER, cluster, true, true);

        // Add helm chart
        setPath(values, "clusterEndpoint", endpoint);
        setPath(values, "clusterName", name);
        values['serviceAccount'] = {
            create: true,
            name: KARPENTER,
            annotations: {
                "eks.amazonaws.com/role-arn": karpenterControllerRole.roleArn,
            }};
        const karpenterChart = this.addHelmChart(clusterInfo, values, false);

        karpenterChart.node.addDependency(ns);

        // (Optional) default provisioner
        if ((Object.keys(subnetTags).length > 0) && (Object.keys(sgTags).length > 0)){
            const provisioner = cluster.addManifest('default-provisioner', {
                apiVersion: 'karpenter.sh/v1alpha5',
                kind: 'Provisioner',
                metadata: { name: 'default' },
                spec: {
                    requirements: this.convertToSpec(provisionerSpecs),
                    provider: {
                        instanceProfile: `${karpenterInstanceProfile}`,
                        subnetSelector: subnetTags,
                        securityGroupSelector: sgTags,
                    },
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