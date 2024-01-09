import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import {supportsALL } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { CfnAddon, FargateCluster } from "aws-cdk-lib/aws-eks";
import { RemovalPolicy } from "aws-cdk-lib";

/**
 * Configuration options for the coredns add-on.
 */
export type CoreDnsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName">;

const defaultProps = {
    addOnName: 'coredns',
    version: 'v1.10.1-eksbuild.4',
    saName: 'coredns',
    configurationValues: {}
};

/**
 * Implementation of CoreDns EKS add-on.
 */
@supportsALL
export class CoreDnsAddOn extends CoreAddOn {

    constructor(props?: CoreDnsAddOnProps) {
        super({ ...defaultProps, ...props });
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
    }
    
}
