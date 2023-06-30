import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
/**
 * User provided options for the Helm Chart
 */
export interface GrafanaOperatorAddonProps extends HelmAddOnUserProps {
  /**
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & GrafanaOperatorAddonProps = {
  name: 'grafana-operator',
  chart: 'oci://ghcr.io/grafana-operator/helm-charts/grafana-operator',
  namespace: 'grafana-operator',
  release: 'grafana-operator',
  version: 'v5.0.0-rc3',
  values: {},
  createNamespace: true
};

/**
 * Main class to instantiate the Helm chart
 */
export class GrafanaOperatorAddon extends HelmAddOn {

  readonly options: GrafanaOperatorAddonProps;

  constructor(props?: GrafanaOperatorAddonProps) {
    super({...defaultProps, ...props});
    this.options = this.props as GrafanaOperatorAddonProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    let values: Values = this.options.values ?? {};
    values = merge(values, this.props.values ?? {});
    const chart = this.addHelmChart(clusterInfo, values);

    if( this.options.createNamespace == true){
      // Let CDK Create the Namespace
      const namespace = createNamespace(this.options.namespace! , cluster);
      chart.node.addDependency(namespace);
    }
    return Promise.resolve(chart);
  }
}