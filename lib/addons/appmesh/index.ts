import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import merge from "ts-deepmerge";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils/namespace-utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";


/**
 * Configuration options for the add-on.
 */
export interface AppMeshAddOnProps extends HelmAddOnUserProps {
    /**
     * If set to true, will enable tracing through App Mesh sidecars, such as X-Ray distributed tracing.
     * Note: support for X-Ray tracing does not depend on the XRay Daemon AddOn installed.
     */
    enableTracing?: boolean,

    /**
     * Tracing provider. Supported values are x-ray, jaeger, datadog
     */
    tracingProvider?: "x-ray" | "jaeger" | "datadog"

    /**
     * Used for Datadog or Jaeger tracing. Example values: datadog.appmesh-system. 
     * Refer to https://aws.github.io/aws-app-mesh-controller-for-k8s/guide/tracing/ for more information.
     * Ignored for X-Ray.
     */
    tracingAddress?: string,

    /**
     * Jaeger or Datadog agent port (ignored for X-Ray)
     */
    tracingPort?: string
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    enableTracing: false,
    tracingProvider: "x-ray",
    name: "appmesh-controller",
    namespace: "appmesh-system",
    chart: "appmesh-controller",
    version: "1.11.0",
    release: "appmesh-release",
    repository: "https://aws.github.io/eks-charts"
};

export class AppMeshAddOn extends HelmAddOn {

    readonly options: AppMeshAddOnProps;

    constructor(props?: AppMeshAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    override deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;

        // App Mesh service account.
        const opts = { name: 'appmesh-controller', namespace: "appmesh-system" };
        const sa = cluster.addServiceAccount('appmesh-controller', opts);

        // Cloud Map Full Access policy.
        const cloudMapPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSCloudMapFullAccess");
        sa.role.addManagedPolicy(cloudMapPolicy);

        // App Mesh Full Access policy.
        const appMeshPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshFullAccess");
        sa.role.addManagedPolicy(appMeshPolicy);

        if (this.options.enableTracing && this.options.tracingProvider === "x-ray") {
            const xrayPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess");
            const nodeGroups = assertEC2NodeGroup(clusterInfo, "App Mesh X-Ray integration");
            nodeGroups.forEach(ng => ng.role.addManagedPolicy(xrayPolicy));
        }

        // App Mesh Namespace
        const namespace = createNamespace('appmesh-system', cluster);
        sa.node.addDependency(namespace);

        let values: Values = {
            region: cluster.stack.region,
            serviceAccount: {
                create: false,
                name: 'appmesh-controller'
            },
            tracing: {
                enabled: this.options.enableTracing,
                provider: this.options.tracingProvider,
                address: this.options.tracingAddress,
                port: this.options.tracingPort
            }
        };

        values = merge(values, this.props.values ?? {});
        
        const chart = this.addHelmChart(clusterInfo, values);
        chart.node.addDependency(sa);
    }
}