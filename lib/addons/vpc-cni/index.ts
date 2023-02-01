import { CoreAddOn } from "../core-addon";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.12.0-eksbuild.1",
            saName: "vpc-cni",
            configuration_values = {
                env: {
                  AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: "true"
                  ENI_CONFIG_LABEL_DEF: "topology.kubernetes.io/zone"
                  ENABLE_PREFIX_DELEGATION: "true"
                  WARM_PREFIX_TARGET: "1"
                }
              }
        });
    }
}