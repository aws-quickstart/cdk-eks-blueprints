import { Construct } from 'constructs';
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { ClusterInfo } from "../../spi";
import { createServiceAccount, createNamespace } from "../../utils";

/**
 * User provided options for the Helm Chart
 */
export interface TraefikAddOnProps extends HelmAddOnUserProps {
    /**
     * Version of the helm chart to deploy
     */    
    version?: string;
}

const TRAEFIK = "traefik";

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & TraefikAddOnProps = {
  name: TRAEFIK,
  chart: TRAEFIK,
  namespace: TRAEFIK,
  version: "v10.24.0",
  release: "blueprints-traefik-addon",
  repository:  "https://helm.traefik.io/traefik",
  values: {},
};

/**
 * Main class to instantiate the Helm chart
 */
export class TraefikAddOn extends HelmAddOn {

  readonly options: TraefikAddOnProps;
  constructor(props?: TraefikAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as TraefikAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    
    const cluster = clusterInfo.cluster;
    const values = this.props.values ?? {};
    
    //Create Service Account with IRSA
    const ns = createNamespace(TRAEFIK, cluster, true, true);
    
    const chart = this.addHelmChart(clusterInfo, values);
    chart.node.addDependency(ns);
    return Promise.resolve(chart);   
  }
}