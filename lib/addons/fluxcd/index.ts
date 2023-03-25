// lib/certmanager_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
/**
 * User provided options for the Helm Chart
 */
export interface FluxcdAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */    
    createNamespace?: boolean;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & FluxcdAddOnProps = {
  name: "blueprints-fluxcd-addon",
  namespace: "flux-system",
  chart: "fluxcd-community",
  version: "2.7.0",
  release: "fluxcd-community",
  repository:  "https://fluxcd-community.github.io/helm-charts",
  values: {},
  createNamespace: true
};

/**
 * Main class to instantiate the Helm chart
 */
export class FluxcdAddOn extends HelmAddOn {

  readonly options: FluxcdAddOnProps;

  constructor(props?: FluxcdAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as FluxcdAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    let values: Values = populateValues(this.options);
    values = merge(values, this.props.values ?? {});

    if( this.options.createNamespace == true){
      // Let CDK Create the Namespace
      const namespace = createNamespace(this.options.namespace! , cluster);
      const chart = this.addHelmChart(clusterInfo, values);
      chart.node.addDependency(namespace);
      return Promise.resolve(chart);

    } else {
      //Namespace is already created
      const chart = this.addHelmChart(clusterInfo, values);
      return Promise.resolve(chart);
    }
    
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: FluxcdAddOnProps): Values {
  const values = helmOptions.values ?? {};
  return values;
}
