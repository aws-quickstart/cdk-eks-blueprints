import { CoreAddOn, CoreAddOnProps } from "../core-addon";

/**
 * Configuration options for the coredns add-on.
 */
export type CoreDnsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName">;

const defaultProps = {
    addOnName: 'coredns',
    version: 'v1.10.1-eksbuild.2',
    saName: 'coredns',
    configurationValues: {}
};

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(props?: CoreDnsAddOnProps) {
        super({ ...defaultProps, ...props });
    }
   
}
