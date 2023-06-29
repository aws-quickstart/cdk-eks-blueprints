import { CfnAddon, KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import { logger } from "../../utils";
import { CoreAddOn } from "../core-addon";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.of("1.27"), "v1.27.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.26.2-eksbuild.1"],
    [KubernetesVersion.V1_25, "v1.25.6-eksbuild.1"],
    [KubernetesVersion.V1_24, "v1.24.7-eksbuild.2"],
    [KubernetesVersion.V1_23, "v1.23.7-eksbuild.1"],
]);

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends CoreAddOn {

    version: string;

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "auto",
            saName: "kube-proxy"
        });
        this.version = version ?? "auto";
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        if (this.version?.trim() === 'auto') {
            const maybeVersion: string | undefined = versionMap.get(clusterInfo.version);
            if(!maybeVersion) {
                this.version = versionMap.values().next().value;
                logger.warn(`Unable to auto-detect kube-proxy version. Applying latest: ${this.version}`);
            } else {
                this.version = maybeVersion;
            }
        }

        let addOnProps = {
            addonName: this.coreAddOnProps.addOnName,
            addonVersion: this.version,
            configurationValues: JSON.stringify(this.coreAddOnProps.configurationValues),
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts: "OVERWRITE"
        };

        const cfnAddon = new CfnAddon(clusterInfo.cluster.stack, this.coreAddOnProps.addOnName + "-addOn", addOnProps);
        // Instantiate the Add-on
        return Promise.resolve(cfnAddon);
    }
}
