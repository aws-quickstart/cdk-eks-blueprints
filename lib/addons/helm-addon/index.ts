import { Construct } from "@aws-cdk/core";
import * as spi from "../..";
import { HelmChartConfiguration, KubectlProvider } from "../../kubectl-providers";

export type HelmAddOnProps = HelmChartConfiguration;

export abstract class HelmAddOn implements spi.ClusterAddOn {

    constructor(readonly props: HelmAddOnProps) {}
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values ) : Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        const chart = {...this.props, ...{ values: values ?? {}} };
        return kubectlProvider.addHelmChart(chart);
    }
}