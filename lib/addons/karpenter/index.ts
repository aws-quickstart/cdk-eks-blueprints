import { Construct } from '@aws-cdk/core';
import { Role, ManagedPolicy, ServicePrincipal, CfnInstanceProfile, PolicyDocument } from '@aws-cdk/aws-iam';
import { ClusterInfo } from '../../spi';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { createNamespace, setPath, createServiceAccount, conflictsWith, tagSubnets } from '../../utils'
import { KarpenterControllerPolicy } from './iam'

/**
 * Configuration options for the add-on
 */
interface KarpenterAddOnProps extends HelmAddOnUserProps {
    /**
     * Specs for a Provisioner (Optional) - If not provided, the add-on will
     * deploy without a Provisioner.
     */
    ProvisionerSpecs?: { 
        'node.kubernetes.io/instance-type': string[],
        'topology.kubernetes.io/zone': string[],
        'kubernetes.io/arch': string[],
        'karpenter.sh/capacity-type': string[],
    }
}

const KARPENTER = 'karpenter'

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: '0.5.3',
    chart: KARPENTER,
    release: "ssp-addon-karpenter",
    repository: 'https://charts.karpenter.sh',
}

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

        // Tag VPC Subnets
        tagSubnets(cluster.stack, cluster.vpc.privateSubnets, `kubernetes.io/cluster/${clusterInfo.cluster.clusterName}`,"1");

        // Set up Node Role
        const karpenterNodeRole = new Role(cluster, 'karpenter-node-role', {
            assumedBy: new ServicePrincipal(`ec2.${cluster.stack.urlSuffix}`),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
                ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
            roleName: `KarpenterNodeRole-${name}`
        });

        // Set up Instance Profile
        const karpenterInstanceProfile = new CfnInstanceProfile(cluster, 'karpenter-instance-profile', {
            roles: [karpenterNodeRole.roleName],
            instanceProfileName: `KarpenterNodeInstanceProfile-${name}`,
            path: '/'
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ['system:bootstrapper', 'system:nodes'],
            username: 'system:node:{{EC2PrivateDNSName}}'
        });

        // Create Namespace & SA
        const ns = createNamespace(KARPENTER, cluster);
        const karpenterPolicyDocument = PolicyDocument.fromJson(KarpenterControllerPolicy);
        const sa = createServiceAccount(cluster, KARPENTER, KARPENTER, karpenterPolicyDocument);
        sa.node.addDependency(ns);

        // Add helm chart
        setPath(values, "serviceAccount.create", false);
        setPath(values, "controller.clusterEndpoint", endpoint);
        setPath(values, "controller.clusterName", name);
        const karpenterChart = this.addHelmChart(clusterInfo, values, true);

        karpenterChart.node.addDependency(sa);

        // (Optional) default provisioner - defaults to 30 seconds for scale down for
        // low utilization
        if (this.options.ProvisionerSpecs){
            const provisioner = cluster.addManifest('default-provisioner', {
                apiVersion: 'karpenter.sh/v1alpha5',
                kind: 'Provisioner',
                metadata: { name: 'default' },
                spec: {
                    requirements: this.convertToSpec(this.options.ProvisionerSpecs),
                    provider: {
                        instanceProfile: `${karpenterInstanceProfile}`
                    },
                }
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
        const newSpecs = []
        for (const key in specs){
            const value = specs[key]
            const requirement = {
                "key": key,
                "operator": "In",
                "values": value
            }
            newSpecs.push(requirement)
        }
        return newSpecs;
    }
}