import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { z } from "zod";
import * as spi from "../..";
import { cloneDeep } from "../../utils";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    constructor(props: HelmAddOnProps) {
        this.props = cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values
        //generalAddonConstraintsValidation(props); This is my addon approach. Leaving it for later
    }
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration ) : Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = {...this.props, ...{ values, wait, timeout, createNamespace} };
        return kubectlProvider.addHelmChart(chart);
    }
}
//below is my addon approach method for when I get too it. Leaving for later
function generalAddonConstraintsValidation(props: HelmAddOnProps){
    try{
        const test = z.string().max(addonConstraints.addonNameMaxLength);
        console.log(props.name + "-=-=-=-=-=")
        test.parse(props.name);
    }
    catch(e){
        throw new Error('Addon Names must be no more than 128 characters long!')
    }
}

var addonConstraints = {
    addonNameMaxLength: 128,
    addonNameMinLength: 1
};