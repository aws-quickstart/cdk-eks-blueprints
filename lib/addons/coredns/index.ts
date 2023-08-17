import { CoreAddOn, CoreAddOnProps } from "../core-addon";

/**
 * Configuration options for the coredns add-on.
 */
type coreDnsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName">;

const defaultProps = {
    addOnName: 'coredns',
    version: 'v1.9.3-eksbuild.5',
    saName: 'coredns',
    configurationValues: {}
};

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(props?: coreDnsAddOnProps) {
        super({ ...defaultProps, ...props });
    }
   
}
