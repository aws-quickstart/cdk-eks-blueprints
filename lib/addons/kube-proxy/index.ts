import { CoreAddOn } from "../core-addon";

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "v1.24.10-eksbuild.2",
            saName: "kube-proxy"
        });
    }
}
