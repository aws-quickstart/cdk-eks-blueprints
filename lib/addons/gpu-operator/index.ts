import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace, supportsALL } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { ValuesSchema } from './values';
/**
 * User provided options for the Helm Chart
 */
export interface GpuOperatorAddonProps extends HelmAddOnUserProps {
  /**
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;

  values?: ValuesSchema;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & GpuOperatorAddonProps = {
    name: "gpu-operator-addon",
    namespace: "gpu-operator",
    chart: "gpu-operator",
    version: "v23.6.1",
    release: "nvidia-gpu-operator",
    repository:  "https://helm.ngc.nvidia.com/nvidia",
    createNamespace: true,
    values: {}
};

/**
 * Main class to instantiate the Helm chart for NVIDIA GPU operator
 * GPU operator manages the software and drivers needed for GPU accelerated workloads
 * It validates all requisite software is installed before scheduling GPU workload
 * Using MIG (Multi Instance GPUs) allows you to virtually split your GPU into multiple units
 */
@supportsALL
export class GpuOperatorAddon extends HelmAddOn {

  readonly options: GpuOperatorAddonProps;

  constructor(props?: GpuOperatorAddonProps) {
    super({...defaultProps, ...props});
    this.options = this.props as GpuOperatorAddonProps;
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