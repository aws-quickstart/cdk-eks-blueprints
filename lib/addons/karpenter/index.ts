import { ServiceAccount, KubernetesManifest } from '@aws-cdk/aws-eks';
import { Role, ManagedPolicy, ServicePrincipal, CfnInstanceProfile, PolicyStatement } from '@aws-cdk/aws-iam';
import { ClusterInfo } from '../../spi';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { setPath } from '../../utils/object-utils'
import { KarpenterControllerPolicy } from './iam'

export type KarpenterAddOnProps = HelmAddOnUserProps

const KARPENTER = 'karpenter'

const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: KARPENTER,
    version: '0.5.3',
    chart: KARPENTER,
    release: "ssp-addon-karpenter",
    repository: 'https://charts.karpenter.sh',
}

export class KarpenterAddOn extends HelmAddOn {

    readonly options: KarpenterAddOnProps;

    // Debug Logging for Karpenter
    readonly debugLogging: boolean;

    constructor(props?: KarpenterAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): void {
        const endpoint = clusterInfo.cluster.clusterEndpoint
        const name = clusterInfo.cluster.clusterName
        const cluster = clusterInfo.cluster
        const values = { ...this.props.values ?? {} }

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
        new CfnInstanceProfile(cluster, 'karpenter-instance-profile', {
            roles: [karpenterNodeRole.roleName],
            instanceProfileName: `KarpenterNodeInstanceProfile-${name}`,
            path: '/'
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ['system:bootstrapper', 'system:nodes'],
            username: 'system:node:{{EC2PrivateDNSName}}'
        })

        // Create Namespace & SA
        const ns = this.createNamespace(clusterInfo)
        const sa = this.createServiceAccount(clusterInfo)
        sa.node.addDependency(ns)

        // Add helm chart
        setPath(values, "serviceAccount.create", false)
        setPath(values, "controller.clusterEndpoint", endpoint)
        setPath(values, "controller.clusterName", name)
        const karpenterChart = this.addHelmChart(clusterInfo, values, true)

        karpenterChart.node.addDependency(sa);
    }

    /**
     * Creates namespace, which is a prerequisite for service account creation and subsequent chart execution.
     * @param clusterInfo 
     * @returns 
    */
     protected createNamespace(clusterInfo: ClusterInfo): KubernetesManifest {
        return new KubernetesManifest(clusterInfo.cluster.stack, "karpenter-namespace-struct", {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: this.options.namespace,
                }
            }],
            overwrite: true,
            prune: true
        });
    }

    /**
     * Creates a service account that can access secrets
     * @param clusterInfo 
     * @returns sa
     */
     protected createServiceAccount(clusterInfo: ClusterInfo): ServiceAccount {
        // Setup IAM Role for Service Accounts (IRSA) for Karpenter Service Account    
        const sa = clusterInfo.cluster.addServiceAccount('karpenter-sa', {
            name: KARPENTER,
            namespace: this.options.namespace,
        });

        KarpenterControllerPolicy.Statement.forEach((statement) => {
            sa.addToPrincipalPolicy(PolicyStatement.fromJson(statement));
        });
        return sa
    }

}