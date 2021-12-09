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
    chart: 'autoscaler/cluster-autoscaler',
    name: 'cluster-autoscaler',
    namespace: 'kube-system',
    release: 'ssp-addon',
    repository: 'https://kubernetes.github.io/autoscaler',
    version: 'auto'
};
/*
ca/cluster-autoscaler      	9.10.8       	1.21.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.7       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.6       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.5       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.4       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.3       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.2       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.1       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.10.0       	1.21.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.9.2        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.9.1        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.9.0        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.8.0        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.7.0        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.6.0        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.5.0        	1.20.0     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.4.0        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.3.2        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.3.1        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.3.0        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.2.0        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.1.0        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
ca/cluster-autoscaler      	9.0.0        	1.18.1     	Scales Kubernetes worker nodes within autoscali...
*/
/**
 * Version of the autoscaler, controls the image tag
 */
const versionMap = new Map([
    [KubernetesVersion.V1_21, "v1.21.1"],
    [KubernetesVersion.V1_20, "v1.20.0"],
    [KubernetesVersion.V1_19, "v1.19.1"],
    [KubernetesVersion.V1_18, "v1.18.3"],
    [KubernetesVersion.V1_17, "v1.17.4"]
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
                cluster: cluster.clusterName
            },
            awsRegion: clusterInfo.cluster.stack.region
        });
    }
}