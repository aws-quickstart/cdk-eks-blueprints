import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import {supportsALL } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { CfnAddon, FargateCluster } from "aws-cdk-lib/aws-eks";
import { RemovalPolicy } from "aws-cdk-lib";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_28, "v1.10.1-eksbuild.6"],
    [KubernetesVersion.V1_27, "v1.10.1-eksbuild.6"],
    [KubernetesVersion.V1_26, "v1.9.3-eksbuild.10"],
    [KubernetesVersion.V1_25, "v1.9.3-eksbuild.10"],
    [KubernetesVersion.V1_24, "v1.9.3-eksbuild.10"],
    [KubernetesVersion.V1_23, "v1.8.7-eksbuild.9"],
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
    handleFargatePatch( addonPromise: Promise<Construct> ): Promise<Construct> {
        addonPromise.then(addon => {
            if(addon instanceof CfnAddon){
                addon.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE)
            }
        })
        return addonPromise;
<<<<<<< HEAD
    }   
=======
    }
    
>>>>>>> bb411535 (Upgrade Core Addons to support MAP of Versions for Kubernetes versions - Fixing Tests)
}
