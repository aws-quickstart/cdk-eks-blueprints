import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import * as utils from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { CfnAddon, FargateCluster } from "aws-cdk-lib/aws-eks";
import { RemovalPolicy } from "aws-cdk-lib";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_31, "v1.11.3-eksbuild.1"],
    [KubernetesVersion.V1_30, "v1.11.1-eksbuild.8"],
    [KubernetesVersion.V1_29, "v1.11.1-eksbuild.4"],
    [KubernetesVersion.V1_28, "v1.10.1-eksbuild.4"],
    [KubernetesVersion.V1_27, "v1.10.1-eksbuild.4"],
    [KubernetesVersion.V1_26, "v1.9.3-eksbuild.7"],
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
@utils.supportsALL
export class CoreDnsAddOn extends CoreAddOn {

    constructor(version?: string, props?: CoreDnsAddOnProps) {
        super({
            version: version ?? "auto",
            ... defaultProps,
            ... props
        });
    }

    @utils.autoMode()
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        const addonPromise: Promise<Construct> = super.deploy(clusterInfo);

        if(clusterInfo.cluster instanceof FargateCluster){
            this.handleFargatePatch(addonPromise);
        }
        return addonPromise;
    }

    /**
     *  Retain the addon otherwise cluster destroy will fail due to CoreDnsComputeTypePatch 
     *  https://github.com/aws/aws-cdk/issues/28621
     */ 
    handleFargatePatch( addonPromise: Promise<Construct> ){
        addonPromise.then(addon => {
            if(addon instanceof CfnAddon){
                addon.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE);
            }
        });
    }   
}
