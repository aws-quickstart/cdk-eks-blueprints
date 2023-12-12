import { CfnJson, Tags } from "aws-cdk-lib";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo } from "../../spi";
import { conflictsWith, createNamespace, createServiceAccount, logger, setPath, supportsALL } from "../../utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";

/**
 * Configuration options for the add-on.
 */
export interface ClusterAutoScalerAddOnProps extends HelmAddOnUserProps {
    /**
     * Version of the Cluster Autoscaler
     * @default auto discovered based on EKS version.
     */
    version?: string;

    /**
     * Create namespace
     */
    createNamespace?: boolean;
}

const RELEASE = 'blueprints-addon-cluster-autoscaler';
const NAME = 'cluster-autoscaler';
/**
 * Defaults options for the add-on
 */
const defaultProps: ClusterAutoScalerAddOnProps = {
    chart: NAME,
    name: NAME,
    namespace: 'kube-system',
    release: RELEASE,
    repository: 'https://kubernetes.github.io/autoscaler',
    version: 'auto'
};

/**
 * Version of the autoscaler, controls the image tag
 */
const versionMap: Map<string, string> = new Map([
    [KubernetesVersion.V1_28.version, "9.34.0"],
    [KubernetesVersion.V1_27.version, "9.33.0"],
    [KubernetesVersion.V1_26.version, "9.29.0"],
    [KubernetesVersion.V1_25.version, "9.29.0"],
    [KubernetesVersion.V1_24.version, "9.25.0"],
    [KubernetesVersion.V1_23.version, "9.21.0"],
    [KubernetesVersion.V1_22.version, "9.13.1"],
    [KubernetesVersion.V1_21.version, "9.13.1"],
    [KubernetesVersion.V1_20.version, "9.9.2"],
    [KubernetesVersion.V1_19.version, "9.4.0"],
    [KubernetesVersion.V1_18.version, "9.4.0"],
]);

@supportsALL
export class ClusterAutoScalerAddOn extends HelmAddOn {

    private options: ClusterAutoScalerAddOnProps;

    constructor(props?: ClusterAutoScalerAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props;
    }
    
    @conflictsWith('KarpenterAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        if(this.options.version?.trim() === 'auto') {
            this.options.version = versionMap.get(clusterInfo.version.version);
            if(!this.options.version) {
                this.options.version = versionMap.values().next().value;
                logger.warn(`Unable to auto-detect cluster autoscaler version. Applying latest: ${this.options.version}`);
            }
        } 

        const cluster = clusterInfo.cluster;
        const nodeGroups = assertEC2NodeGroup(clusterInfo, "Cluster Autoscaler");
        const values = this.options.values || {};
        const namespace = this.options.namespace!;
        
        // Create IAM Policy
        const autoscalerStmt = new iam.PolicyStatement();
        autoscalerStmt.addResources("*");
        autoscalerStmt.addActions(
            "autoscaling:DescribeAutoScalingGroups",
            "autoscaling:DescribeAutoScalingInstances",
            "autoscaling:DescribeLaunchConfigurations",
            "autoscaling:DescribeTags",
            "autoscaling:SetDesiredCapacity",
            "autoscaling:TerminateInstanceInAutoScalingGroup",
            "ec2:DescribeLaunchTemplateVersions",
            "ec2:DescribeInstanceTypes",
            "eks:DescribeNodegroup"
        );

        const autoscalerPolicyDocument = new iam.PolicyDocument({
            statements: [autoscalerStmt]
        });

        // Tag node groups
        const clusterName = new CfnJson(cluster.stack, "clusterName", {
            value: cluster.clusterName,
        });
        for(let ng of nodeGroups) {
            Tags.of(ng).add(`k8s.io/cluster-autoscaler/${clusterName}`, "owned", { applyToLaunchedInstances: true });
            Tags.of(ng).add("k8s.io/cluster-autoscaler/enabled", "true", { applyToLaunchedInstances: true });
        }
        
        // Create namespace
        if (this.options.createNamespace) {
            createNamespace(namespace, cluster, true);
        }

        // Create IRSA
        const sa = createServiceAccount(cluster, RELEASE, namespace, autoscalerPolicyDocument);

        // Create Helm Chart
        setPath(values, "cloudProvider", "aws");
        setPath(values, "autoDiscovery.clusterName", cluster.clusterName);
        setPath(values, "awsRegion", cluster.stack.region);
        setPath(values, "rbac.serviceAccount.create", false);
        setPath(values, "rbac.serviceAccount.name", RELEASE);
        
        const clusterAutoscalerChart = this.addHelmChart(clusterInfo, values, false);
        clusterAutoscalerChart.node.addDependency(sa);

        return Promise.resolve(clusterAutoscalerChart);
    }
}
