import { HelmChart, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { createNamespace } from '../../utils';
import * as spi from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from '../helm-addon';

/**
 * Configuration options for add-on.
 */
 export interface ParalusAddOnProps extends HelmAddOnUserProps {
    /**
     * Namespace where add-on will be deployed. 
     * @default paralus-system
     */
    namespace?: string;

    /**
    * Helm chart version to use to install.
    * @default 0.2.0
    */
    version?: string;

    /**
     * Values to pass to the chart as per https://github.com/paralus/helm-charts/blob/main/charts/ztka/values.yaml.
     */
    values?: spi.Values;
    
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    namespace: "paralus-system",
    version: '0.2.0',
    chart: "paralus/ztka",
    release: "blueprints-addon-paralus",
    repository: "https://paralus.github.io/helm-charts"
};

/**
 * Implementation of paralus add-on and post deployment hook.
 */
 export class ParalusAddOn extends HelmAddOn {

    readonly options: ParalusAddOnProps;

    private chartNode?: HelmChart;

    constructor(props?: ParalusAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = { ...defaultProps, ...props };
        HelmAddOn.validateVersion({
            chart: this.options.chart!,
            version: this.options.version!,
            repository: this.options.repository!
        });
    }

    /**
     * Implementation of the add-on contract deploy method.
    */
    deploy(clusterInfo: spi.ClusterInfo): Promise<Construct> {
        const namespace = createNamespace(this.options.namespace!, clusterInfo.cluster, true);

        const serviceAccountName = 'paralus-controller-sa';
        const sa = this.createServiceAccount(clusterInfo, serviceAccountName);
        sa.node.addDependency(namespace);

        // Configure values.
        const values = {
            serviceAccount: {
                name: serviceAccountName,
                create: false
            },
            ...this.options.values
        };

        this.chartNode = clusterInfo.cluster.addHelmChart("paralus-addon", {
            chart: this.options.chart!,
            release: this.options.release,
            repository: this.options.repository,
            version: this.options.version,
            namespace: this.options.namespace,
            values: values
        });

        this.chartNode.node.addDependency(sa);

        return Promise.resolve(this.chartNode);
    }
    
    /**
     * Creates a service account that can access secrets
     * @param clusterInfo 
     * @returns 
     */
    protected createServiceAccount(clusterInfo: spi.ClusterInfo, serviceAccountName: string): ServiceAccount {
        const sa = clusterInfo.cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: this.options.namespace
        });
        return sa;
    }
}