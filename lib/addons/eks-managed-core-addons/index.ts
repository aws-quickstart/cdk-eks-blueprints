import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";

export class EksManagedCoreAddOnProps {

    readonly addOnName: string;
    readonly version: string;
}

/**
 * Implementation of EKS Managed add-ons.
 */
export class EksManagedCoreAddOns implements ClusterAddOn {

    readonly managedAddOnProps: EksManagedCoreAddOnProps;

    constructor(eksManagedCoreAddOnProps: EksManagedCoreAddOnProps) {
        this.managedAddOnProps = eksManagedCoreAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): void {
        new CfnAddon(clusterInfo.cluster.stack, this.managedAddOnProps.addOnName + "-addOn", {
            addonName: this.managedAddOnProps.addOnName,
            addonVersion: this.managedAddOnProps.version,
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts: "OVERWRITE"
        });
    }
}
