import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as spi from "../..";
import { cloneDeep, ConstraintsType, StringConstraint, UrlStringConstraint, validateConstraints } from "../../utils";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export class HelmAddonPropsConstraints implements ConstraintsType<HelmAddOnProps> {
    /**
    * chart can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    chart = new StringConstraint(1, 63);

    /**
    * name can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    name = new StringConstraint(1, 63);

    /**
    * namespace can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    namespace = new StringConstraint(1, 63);

    /**
    * release can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    release = new StringConstraint(1, 63);

    /**
    * repository can be no less than 1 character long, and no greater than 63 characters long. It also must follow a URL format.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    repository = new UrlStringConstraint(1, 63);

    /**
    * version can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    version = new StringConstraint(1, 63);
}

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    constructor(props: HelmAddOnProps) {
        this.props = cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values

        validateConstraints(new HelmAddonPropsConstraints, HelmAddOn.name, props);
    }

    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration): Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = { ...this.props, ...{ values, wait, timeout, createNamespace } };
        return kubectlProvider.addHelmChart(chart);
    }
}