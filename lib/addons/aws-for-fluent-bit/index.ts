import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";

import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo } from "../../spi/types";
import { createNamespace } from "../../utils/namespace-utils";
import { supportsALL } from '../../utils';

/**
 * Default aws-for-fluent-bit image tag. The eks-charts `aws-for-fluent-bit` chart appVersion
 * lags the published image tags (chart 0.2.0 ships 3.2.1), so we override `image.tag` to pick
 * up OS-package/openssl CVE fixes (e.g. ALAS2023-2026-1853). Pinned to the latest published
 * mainline tag; override via the `imageTag` prop (or `values.image.tag`) to use another line
 * such as the `stable` LTS release.
 */
const DEFAULT_FLUENT_BIT_IMAGE_TAG = "3.4.5";

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

    /**
     * aws-for-fluent-bit container image tag to deploy. Overrides the Helm chart's default
     * (lagging) appVersion. Defaults to the latest published mainline tag. Set this to pin a
     * specific patched build or a different release line (e.g. the `stable` LTS tag).
     */
    imageTag?: string
}
/**
 * Default props for the add-on.
 */
const defaultProps: AwsForFluentBitAddOnProps = {
    name: 'fluent-bit',
    chart: 'aws-for-fluent-bit',
    release: "blueprints-addon-aws-for-fluent-bit",
    version: '0.2.0',
    repository: 'https://aws.github.io/eks-charts',
    namespace: 'kube-system',
    createNamespace: false,
    imageTag: DEFAULT_FLUENT_BIT_IMAGE_TAG,
    values: {}
};

/**
 * AwsForFluentBitAddOn deploys FluentBit into an EKS cluster using the `aws-for-fluent-bit` Helm chart.
 * https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit
 * 
 * For information on how to configure the `aws-for-fluent-bit` Helm chart to forward logs and metrics to AWS services like CloudWatch or Kinesis, please view the values.yaml spec provided by the chart.
 * https://github.com/aws/eks-charts/blob/master/stable/aws-for-fluent-bit/values.yaml
 */
@supportsALL
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
            // Pin the aws-for-fluent-bit image tag (chart appVersion lags published tags). Configurable
            // via the `imageTag` prop; user-provided values.image.tag overrides via the spread below.
            image: {
                tag: this.options.imageTag
            },
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
