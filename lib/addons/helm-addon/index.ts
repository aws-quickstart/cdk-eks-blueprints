import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as spi from "../..";
import { cloneDeep } from "../../utils";
import { HelmChartVersion, validateLatestVersion } from "./helm-version-checker";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    public static validateHelmVersions = false;
    public static failOnVersionValidation = false;

    constructor(props: HelmAddOnProps) {
        this.props = cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values
        validateLatestVersion(props);
    }

    public static validateVersion(helmChart: HelmChartVersion) {
        if(HelmAddOn.validateHelmVersions) {
            const result = validateLatestVersion(helmChart);
            if(this.failOnVersionValidation && !result.latestVersion) {
                throw new Error(`Helm version validation failed for ${helmChart.chart}. 
                    Used version ${helmChart.version}, latest version: ${result.highestVersion}`);
            }
        }
    }
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration ) : Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = {...this.props, ...{ values, wait, timeout, createNamespace} };
        return kubectlProvider.addHelmChart(chart);
    }
}