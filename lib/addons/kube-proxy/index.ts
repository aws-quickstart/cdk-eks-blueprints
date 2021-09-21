import { EksManagedCoreAddOns } from "../eks-managed-core-addOns";

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends EksManagedCoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "v1.19.6-eksbuild.2"
        });
    }
}
