import { CoreAddOn } from "../core-addon";

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "v1.21.2-eksbuild.2"
        });
    }
}
