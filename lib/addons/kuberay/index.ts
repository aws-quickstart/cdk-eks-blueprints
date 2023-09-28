import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";

/**
 * User provided options for the Helm Chart
 */
export interface KubeRayAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */    
    createNamespace?: boolean;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & KubeRayAddOnProps = {
  name: "kuberay-operator",
  chart: "kuberay/kuberay-operator",
  namespace:"default",
  version: "1.0.0-rc.0",
  release: "KubeRay",
  repository:  "https://ray-project.github.io/kuberay-helm",
  values: {},
  createNamespace: true
};

/**
 * Main class to instantiate the Helm chart
 */
export class KubeRayAddOn extends HelmAddOn {

  readonly options: KubeRayAddOnProps;
  constructor(props?: KubeRayAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as KubeRayAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    let values: Values = this.options.values ?? {};
    values = merge(values, this.props.values ?? {});

    const chart = this.addHelmChart(clusterInfo, values);

    if( this.options.createNamespace == true){
      const namespace = createNamespace(this.options.namespace! , cluster);
      chart.node.addDependency(namespace);
    }
    return Promise.resolve(chart);
  }
}
