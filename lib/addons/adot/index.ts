import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Construct, IConstruct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { createNamespace, dependable, loadYaml, readYamlDocument, supportsALL } from "../../utils";
import { CertManagerAddOn } from "../cert-manager";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { getAdotCollectorPolicyDocument } from "./iam-policy";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_29, "v0.92.1-eksbuild.1"],
    [KubernetesVersion.V1_28, "v0.92.1-eksbuild.1"],
    [KubernetesVersion.V1_27, "v0.92.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v0.92.1-eksbuild.1"],
]);

/**
 * Configuration options for the Adot add-on.
 */
export type AdotCollectorAddOnProps = Partial<Omit<CoreAddOnProps, "addOnName" | "controlPlaneAddOn" | "saName">> & {
    namespace?: string;
};

const defaultProps = {
    addOnName: 'adot',
    version: 'auto',
    versionMap: versionMap,
    saName: 'adot-collector',
    policyDocumentProvider: getAdotCollectorPolicyDocument,
    namespace: 'default',
    configurationValues: {}
};

/**
 * Implementation of Adot Collector EKS add-on.
 */
@supportsALL
export class AdotCollectorAddOn extends CoreAddOn {

    constructor(props?: AdotCollectorAddOnProps) {
        super({
            ...defaultProps,
            ...props,
            namespace: props?.namespace ?? defaultProps.namespace,
            version: props?.version ?? defaultProps.version
        });
    }

    @dependable(CertManagerAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const addOnPromise = super.deploy(clusterInfo);
        return addOnPromise;
    }

    /**
     * Overriding base class method to create namespace and register permissions.
     * @param clusterInfo 
     * @param name 
     * @returns 
     */
    createNamespace(clusterInfo: ClusterInfo, namespaceName: string): IConstruct | undefined {
        // Create namespace if not default
        const cluster = clusterInfo.cluster;
        const ns = createNamespace(namespaceName, cluster, true, true);

        // Applying ADOT Permission manifest
        const otelPermissionsDoc = readYamlDocument(__dirname + '/otel-permissions.yaml');
        const otelPermissionsManifest = otelPermissionsDoc.split("---").map(e => loadYaml(e));
        const otelPermissionsStatement = new KubernetesManifest(cluster.stack, "adot-addon-otelPermissions", {
            cluster,
            manifest: otelPermissionsManifest,
            overwrite: true,
        });

        otelPermissionsStatement.node.addDependency(ns);
        return otelPermissionsStatement;
    }
}

