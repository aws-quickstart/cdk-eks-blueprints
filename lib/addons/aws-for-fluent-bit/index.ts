import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";

import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo } from "../../spi/types";
import { createNamespace } from "../../utils/namespace-utils";

/**
 * Configuration options for the FluentBit add-on.
 */
export interface AwsForFluentBitAddOnProps extends HelmAddOnUserProps {
    /**
     * Iam policies for the add-on.
     */
    iamPolicies?: PolicyStatement[],

    /**
     * Create Namespace with the provided one (will not if namespace is kube-system)
     */
    createNamespace?: boolean
}
/**
 * Default props for the add-on.
 */
const defaultProps: AwsForFluentBitAddOnProps = {
    name: 'fluent-bit',
    chart: 'aws-for-fluent-bit',
    release: "blueprints-addon-aws-for-fluent-bit",
    version: '0.1.24',
    repository: 'https://aws.github.io/eks-charts',
    namespace: 'kube-system',
    createNamespace: false,
    values: {}
};

/**
 * AwsForFluentBitAddOn deploys FluentBit into an EKS cluster using the `aws-for-fluent-bit` Helm chart.
 * https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit
 * 
 * For information on how to configure the `aws-for-fluent-bit` Helm chart to forward logs and metrics to AWS services like CloudWatch or Kinesis, please view the values.yaml spec provided by the chart.
 * https://github.com/aws/eks-charts/blob/master/stable/aws-for-fluent-bit/values.yaml
 */
export class AwsForFluentBitAddOn extends HelmAddOn {

    readonly options: AwsForFluentBitAddOnProps;

    constructor(props?: AwsForFluentBitAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const namespace = this.options.namespace!;

        // Create the FluentBut service account.
        const serviceAccountName = 'aws-for-fluent-bit-sa';
        const sa = cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: namespace
        });

        // Create namespace
        if (this.options.createNamespace) {
            const ns = createNamespace(namespace, cluster, true);
            sa.node.addDependency(ns);
        }

        // Apply additional IAM policies to the service account.
        const policies = this.options.iamPolicies || [];
        policies.forEach((policy: PolicyStatement) => sa.addToPrincipalPolicy(policy));

        // Configure values.
        const values = {
            serviceAccount: {
                name: serviceAccountName,
                create: false
            },
            ...this.options.values
        };

        const helmChart = this.addHelmChart(clusterInfo, values);
        helmChart.node.addDependency(sa);
        return Promise.resolve(helmChart);
    }
}
