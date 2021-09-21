import { CoreAddOns } from "../core-addons";

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends CoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "v1.19.6-eksbuild.2"
        });
    }
}
