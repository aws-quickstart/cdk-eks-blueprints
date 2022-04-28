import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as spi from "../..";
import { cloneDeep } from "../../utils";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    constructor(props: HelmAddOnProps) {
        this.props = cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values
    }
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration ) : Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = {...this.props, ...{ values, wait, timeout, createNamespace} };
        return kubectlProvider.addHelmChart(chart);
    }
}