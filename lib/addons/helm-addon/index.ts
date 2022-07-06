import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as spi from "../..";
import { cloneDeep, ConstraintsType, StringConstraint, validateConstraints } from "../../utils";
import { HelmChartConfiguration, KubectlProvider } from "./kubectl-provider";

export type HelmAddOnProps = HelmChartConfiguration;
export type HelmAddOnUserProps = Partial<HelmChartConfiguration>;

export const helmAddonPropsContraints: ConstraintsType<HelmAddOnProps> = {
    /**
 * chart can be no less than 1 character long, and no greater than 63 characters long.
 */
    chart: new StringConstraint(1, 63),
    /**
 * name can be undefined, but cannot be greater than 63 characters long.
 */
    name: new StringConstraint(undefined, 63),
    /**
 * namespace can be no less than 1 character long, and no greater than 63 characters long.
 */
    namespace: new StringConstraint(1, 63),
    /**
 * release can be no less than 1 character long, and no greater than 63 characters long.
 */
    release: new StringConstraint(1, 63),
    /**
 * repository can be no less than 1 character long, and no greater than 63 characters long.
 */
    repository: new StringConstraint(1, 63), //add URL constraint
    /**
 * version can be no less than 1 character long, and no greater than 63 characters long.
 */
    version: new StringConstraint(1, 63)
};

export abstract class HelmAddOn implements spi.ClusterAddOn {

    props: HelmAddOnProps;

    constructor(props: HelmAddOnProps) {
        this.props = cloneDeep(props); // avoids polution when reusing the same props across stacks, such as values

        validateConstraints([props], helmAddonPropsContraints, HelmAddOn.name);
    }

    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values, createNamespace?: boolean, wait?: boolean, timeout?: Duration): Construct {
        const kubectlProvider = new KubectlProvider(clusterInfo);
        values = values ?? {};
        const chart = { ...this.props, ...{ values, wait, timeout, createNamespace } };
        return kubectlProvider.addHelmChart(chart);
    }
}