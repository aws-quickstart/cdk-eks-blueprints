import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";

export class EksManagedCoreAddonProps {

    readonly addonName: string;
    readonly version: string;
}

/**
 * Implementation of EKS Managed add-ons.
 */
export class EksManagedCoreAddons implements ClusterAddOn {

    readonly managedAddonProps: EksManagedCoreAddonProps;

    constructor(eksManagedCoreAddonProps: EksManagedCoreAddonProps) {
        this.managedAddonProps = eksManagedCoreAddonProps;
    }

    deploy(clusterInfo: ClusterInfo): void {
        new CfnAddon(clusterInfo.cluster.stack, this.managedAddonProps.addonName + "-addon", {
            addonName: this.managedAddonProps.addonName,
            addonVersion: this.managedAddonProps.version,
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts: "OVERWRITE"
        });
    }
}
