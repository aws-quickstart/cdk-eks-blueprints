import { CfnJson, Tags } from "aws-cdk-lib";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { assert } from "console";
import { Construct } from "constructs";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo } from "../../spi";
import { conflictsWith, createNamespace, createServiceAccount, setPath } from "../../utils";
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
const versionMap = new Map([
    [KubernetesVersion.of("1.25"), "9.25.0"],
    [KubernetesVersion.V1_24, "9.25.0"],
    [KubernetesVersion.V1_23, "9.21.0"],
    [KubernetesVersion.V1_22, "9.13.1"],
    [KubernetesVersion.V1_24, "9.13.1"],
    [KubernetesVersion.V1_20, "9.9.2"],
    [KubernetesVersion.V1_19, "9.4.0"],
    [KubernetesVersion.V1_18, "9.4.0"],
]);

export class ClusterAutoScalerAddOn extends HelmAddOn {

    private options: ClusterAutoScalerAddOnProps;

    constructor(props?: ClusterAutoScalerAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props;
    }
    
    @conflictsWith('KarpenterAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        if(this.options.version?.trim() === 'auto') {
            this.options.version = versionMap.get(clusterInfo.version);
            assert(this.options.version, "Unable to auto-detect cluster autoscaler version. Applying latest. Provided EKS cluster version: " 
                + clusterInfo.version?.version ?? clusterInfo.version);
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
            "ec2:DescribeInstanceTypes"
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