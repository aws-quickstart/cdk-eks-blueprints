import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { HelmChartVersion, checkHelmChartVersion } from "./helm-version-checker";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";
import * as spi from "../..";
import * as utils from "../../utils";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export class HelmAddonPropsConstraints implements utils.ConstraintsType<HelmAddOnProps> {
    /**
    * chart can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://helm.sh/docs/chart_template_guide/getting_started/#:~:text=TIP%3A%20The%20name%3A%20field%20is,are%20limited%20to%2053%20characters
    */
    chart = new utils.StringConstraint(1, 63);

    /**
    * name can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://helm.sh/docs/chart_template_guide/getting_started/#:~:text=TIP%3A%20The%20name%3A%20field%20is,are%20limited%20to%2053%20characters
    */
    name = new utils.StringConstraint(1, 63);

    /**
    * namespace can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://helm.sh/docs/chart_template_guide/getting_started/#:~:text=TIP%3A%20The%20name%3A%20field%20is,are%20limited%20to%2053%20characters
    */
    namespace = new utils.StringConstraint(1, 63);

    /**
    * release can be no less than 1 character long, and no greater than 53 characters long.
    * https://helm.sh/docs/chart_template_guide/getting_started/#:~:text=TIP%3A%20The%20name%3A%20field%20is,are%20limited%20to%2053%20characters
    */
    release = new utils.StringConstraint(1, 53);

    /**
    * repository can be no less than 0 characters long, and no greater than 4096 characters long. It also must follow a URL format.
    * https://docs.aws.amazon.com/connect/latest/APIReference/API_UrlReference.html
    */
    repository = new utils.UrlStringConstraint(0, 4096);

    /**
    * version can be no less than 1 character long, and no greater than 63 characters long due to DNS system limitations.
    * https://helm.sh/docs/chart_template_guide/getting_started/#:~:text=TIP%3A%20The%20name%3A%20field%20is,are%20limited%20to%2053%20characters
    */
    version = new utils.StringConstraint(1, 63);
}

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    public static validateHelmVersions = false;
    public static failOnVersionValidation = false;

    constructor(props: HelmAddOnProps) {
        this.props = utils.cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values
        utils.validateConstraints(new HelmAddonPropsConstraints, HelmAddOn.name, props);
        HelmAddOn.validateVersion(props);
    }

    public static validateVersion(helmChart: HelmChartVersion) {
        if(HelmAddOn.validateHelmVersions && !helmChart.skipVersionValidation) {
            const result = checkHelmChartVersion(helmChart);
            if(this.failOnVersionValidation && !result.latestVersion) {
                throw new Error(`Helm version validation failed for ${helmChart.chart}. 
                    Used version ${helmChart.version}, latest version: ${result.highestVersion}`);
            }
        }
    }

    /**
     * Expected to be implemented in concrete subclasses.
     * @param clusterInfo 
     */
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

 
    /**
     * Deploys the helm chart in the cluster. 
     * @param clusterInfo 
     * @param values 
     * @param createNamespace 
     * @param wait 
     * @param timeout 
     * @returns 
     */
    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration): Construct {
       const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const dependencyMode = this.props.dependencyMode ?? true;
        const chart = { ...this.props, ...{ values, dependencyMode, wait, timeout, createNamespace } };
        return kubectlProvider.addHelmChart(chart);
    }
}