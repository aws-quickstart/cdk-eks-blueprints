import {supportsALL } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_28, "v1.10.1-eksbuild.2"],
    [KubernetesVersion.V1_27, "v1.10.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.9.3-eksbuild.2"],
]);

/**
 * Configuration options for the coredns add-on.
 */
export type CoreDnsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName" | "version" >;

const defaultProps = {
    addOnName: 'coredns',
    versionMap: versionMap,
    saName: 'coredns',
    configurationValues: {}
};

/**
 * Implementation of CoreDns EKS add-on.
 */
@supportsALL
export class CoreDnsAddOn extends CoreAddOn {

    constructor(version?: string, props?: CoreDnsAddOnProps) {
        super({
            version: version ?? "auto",
            ... defaultProps,
            ... props
        });
    }

}
