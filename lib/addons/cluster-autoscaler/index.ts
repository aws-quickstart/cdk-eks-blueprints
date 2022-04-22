import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { CfnJson, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { assert } from "console";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo } from "../../spi";
import { conflictsWith, createServiceAccount, setPath } from "../../utils";
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

const RELEASE = 'blueprints-addon-cluster-autoscaler';
const NAME = 'cluster-autoscaler';
/**
 * Defaults options for the add-on
 */
const defaultProps = {
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
    [KubernetesVersion.V1_21, "9.10.8"],
    [KubernetesVersion.V1_20, "9.9.2"],
    [KubernetesVersion.V1_19, "9.4.0"],
    [KubernetesVersion.V1_18, "9.4.0"],
]);

export class ClusterAutoScalerAddOn extends HelmAddOn {

    private options: ClusterAutoScalerAddOnProps;

    constructor(props?: ClusterAutoScalerAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }
    
    @conflictsWith('KarpenterAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        if(this.options.version?.trim() === 'auto') {
            this.options.version = versionMap.get(clusterInfo.version);
            assert(this.options.version, `Unable to auto-detect cluster autoscaler version for EKS cluster version ${clusterInfo.version}`);
        } 

        const cluster = clusterInfo.cluster;
        const nodeGroups = assertEC2NodeGroup(clusterInfo, "Cluster Autoscaler");
        const values = this.options.values || {};
        
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
            "ec2:DescribeLaunchTemplateVersions"
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

        // Create IRSA
        const sa = createServiceAccount(cluster,
            RELEASE, 
            "kube-system",
            autoscalerPolicyDocument
        );
        
        // Create Helm Chart
        setPath(values, "cloudProvider", "aws");
        setPath(values, "autoDiscovery.clusterName", cluster.clusterName);
        setPath(values, "awsRegion", cluster.stack.region);
        setPath(values, "rbac.serviceAccount.create", false);
        setPath(values, "rbac.serviceAccount.name", RELEASE);
        setPath(values, "rbac.serviceAccount.annotations", {"eks.amazonaws.com/role-arn": sa.role.roleArn});
        
        const clusterAutoscalerChart = this.addHelmChart(clusterInfo, values, false);
        clusterAutoscalerChart.node.addDependency(sa);

        return Promise.resolve(clusterAutoscalerChart);
    }
}