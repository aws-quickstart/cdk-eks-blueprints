import { EksManagedCoreAddons } from "../eks-managed-core-addons";

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends EksManagedCoreAddons {

    constructor(version?: string) {
        super({
            addonName: "kube-proxy",
            version: version ?? "v1.19.6-eksbuild.2"
        });
    }
}
