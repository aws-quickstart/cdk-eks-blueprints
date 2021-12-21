import { Construct, Duration } from "@aws-cdk/core";
import * as spi from "../..";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export abstract class HelmAddOn implements spi.ClusterAddOn {

    constructor(readonly props: HelmAddOnProps) {}
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, wait?: boolean, timeout?: Duration ) : Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = {...this.props, ...{ values, wait, timeout} };
        return kubectlProvider.addHelmChart(chart);
    }
}