import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { merge } from "ts-deepmerge";
import { conflictsWith, setPath, supportsALL } from "../../utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi/types";
import { createNamespace } from "../../utils/namespace-utils";
import { getCloudWatchLogsPolicyDocument } from "./iam-policy";

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
export interface CloudWatchLogsAddonProps extends HelmAddOnUserProps {
    /**
     * Create Namespace with the provided one (will not if namespace is kube-system)
     */
    createNamespace?: boolean

    /**
     * Name of the service account for fluent bit.
     */
    serviceAccountName?: string;

    /**
     * CloudWatch Log Group Name.
     */
    logGroupPrefix: string;

    /**
     * CloudWatch Log retention days
     */
    logRetentionDays?: number;

    /**
     * aws-for-fluent-bit container image tag to deploy. Overrides the Helm chart's default
     * (lagging) appVersion. Defaults to the latest published mainline tag. Set this to pin a
     * specific patched build or a different release line (e.g. the `stable` LTS tag).
     */
    imageTag?: string;
}
/**
 * Default props for the add-on.
 */
const defaultProps: CloudWatchLogsAddonProps = {
    name: 'aws-for-fluent-bit',
    chart: 'aws-for-fluent-bit',
    release: "blueprints-addon-aws-fluent-bit-for-cw",
    version: '0.2.0',
    repository: 'https://aws.github.io/eks-charts',
    namespace: 'aws-for-fluent-bit',
    createNamespace: true,
    serviceAccountName: 'aws-fluent-bit-for-cw-sa',
    logGroupPrefix: '/aws/eks/blueprints-construct-dev', 
    logRetentionDays: 90,
    imageTag: DEFAULT_FLUENT_BIT_IMAGE_TAG,
    values: {}
};

/**
 * CloudWatchLogsAddon deploys FluentBit into an EKS cluster using the `aws-for-fluent-bit` Helm chart.
 * https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit
 * 
 */
@supportsALL
export class CloudWatchLogsAddon extends HelmAddOn {

    readonly options: CloudWatchLogsAddonProps;

    constructor(props: CloudWatchLogsAddonProps) {
        super({ ...defaultProps as any, ...props });
        this.options = { ...defaultProps, ...this.props };
    }

    @conflictsWith('AwsForFluentBitAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        let values: Values = populateValues(clusterInfo, this.options);
        values = merge(values, this.props.values ?? {});
        const cluster = clusterInfo.cluster;
        const namespace = this.options.namespace!;

        // Create the FluentBut service account.
        const serviceAccountName = this.options.serviceAccountName!;
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
        getCloudWatchLogsPolicyDocument().forEach((statement) => {
            sa.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        const helmChart = this.addHelmChart(clusterInfo, values);
        helmChart.node.addDependency(sa);
        return Promise.resolve(helmChart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(clusterInfo: ClusterInfo, helmOptions: CloudWatchLogsAddonProps): Values {
    const values = helmOptions.values ?? {};
    // Pin the aws-for-fluent-bit image tag (the eks-charts chart appVersion lags published tags,
    // leaving OS/openssl CVEs unpatched). Configurable via the `imageTag` prop; a user-provided
    // values.image.tag still wins via the merge in deploy().
    setPath(values, "image.tag", helmOptions.imageTag);
    setPath(values, "serviceAccount.name", helmOptions.serviceAccountName);
    setPath(values, "serviceAccount.create", false);
    setPath(values, "cloudWatch.enabled", false);
    setPath(values, "cloudWatchLogs.enabled", true);
    setPath(values, "cloudWatchLogs.region", clusterInfo.cluster.stack.region);
    setPath(values, "cloudWatchLogs.logGroupName", `${helmOptions.logGroupPrefix}/workloads`);
    setPath(values, "cloudWatchLogs.logGroupTemplate", `${helmOptions.logGroupPrefix}/$kubernetes['namespace_name']`);
    setPath(values, "cloudWatchLogs.logStreamTemplate", "$kubernetes['container_name'].$kubernetes['pod_name']");
    setPath(values, "cloudWatchLogs.logKey", "log");
    setPath(values, "cloudWatchLogs.logRetentionDays", helmOptions.logRetentionDays);
    return values;
}