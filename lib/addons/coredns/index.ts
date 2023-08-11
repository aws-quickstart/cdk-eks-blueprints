import { CoreAddOn, CoreAddOnProps } from "../core-addon";

/**
 * Configuration options for the coredns add-on.
 */
type corednsCollectorAddOnProps = CoreAddOnProps;


const defaultProps = {
    addOnName: 'coredns',
    version: 'v1.9.3-eksbuild.5',
    saName: 'coredns'
}

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(props?: corednsCollectorAddOnProps) {
        super({ ...defaultProps, ...props });
    }
   
}
