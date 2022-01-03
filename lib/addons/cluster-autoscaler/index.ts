import { KubernetesVersion } from "@aws-cdk/aws-eks";
import * as iam from "@aws-cdk/aws-iam";
import { CfnJson, Tags } from "@aws-cdk/core";
import { assert } from "console";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo } from "../../spi";
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
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    chart: 'cluster-autoscaler',
    name: 'cluster-autoscaler',
    namespace: 'kube-system',
    release: 'ssp-addon-cluster-autoscaler',
    repository: 'https://kubernetes.github.io/autoscaler',
    version: 'auto'
};

/**
 * Version of the autoscaler, controls the image tag
 */
const versionMap = new Map([
    [KubernetesVersion.V1_21, "9.10.8"],
    [KubernetesVersion.V1_20, "9.9.1"],
    [KubernetesVersion.V1_19, "9.4.0"],
    [KubernetesVersion.V1_18, "9.4.0"],
    [KubernetesVersion.V1_17, "9.4.0"]
]);



export class ClusterAutoScalerAddOn extends HelmAddOn {

    private options: ClusterAutoScalerAddOnProps;

    constructor(props?: ClusterAutoScalerAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): void {

        if(this.options.version?.trim() === 'auto') {
            this.options.version = versionMap.get(clusterInfo.version);
            assert(this.options.version, `Unable to auto-detect cluster autoscaler version for EKS cluster version ${clusterInfo.version}`);
        } 

        const cluster = clusterInfo.cluster;
        const ng = assertEC2NodeGroup(clusterInfo, "Cluster Autoscaler");
        const autoscalerStmt = new iam.PolicyStatement();

        autoscalerStmt.addResources("*");
        autoscalerStmt.addActions(
            "autoscaling:DescribeAutoScalingGroups",
            "autoscaling:DescribeAutoScalingInstances",
            "autoscaling:DescribeLaunchConfigurations",
            "autoscaling:DescribeTags",
            "autoscaling:SetDesiredCapacity",
            "autoscaling:TerminateInstanceInAutoScalingGroup",
            "ec2:DescribeInstanceTypes",
            "ec2:DescribeLaunchTemplateVersions"
        );
        const autoscalerPolicy = new iam.Policy(cluster.stack, "cluster-autoscaler-policy", {
            policyName: "ClusterAutoscalerPolicy",
            statements: [autoscalerStmt],
        });
        autoscalerPolicy.attachToRole(ng.role);

        const clusterName = new CfnJson(cluster.stack, "clusterName", {
            value: cluster.clusterName,
        });
        Tags.of(ng).add(`k8s.io/cluster-autoscaler/${clusterName}`, "owned", { applyToLaunchedInstances: true });
        Tags.of(ng).add("k8s.io/cluster-autoscaler/enabled", "true", { applyToLaunchedInstances: true });

        this.addHelmChart(clusterInfo, {
            cloudProvider: 'aws',
            autoDiscovery: {
                clusterName: cluster.clusterName
            },
            awsRegion: clusterInfo.cluster.stack.region
        });
    }
}