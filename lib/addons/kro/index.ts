import { Construct } from "constructs";
import { ClusterInfo, Values } from "../../spi";
import { merge } from "ts-deepmerge";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import * as utils from "../../utils";

const KRO_VERSION="0.9.2";

export interface KroAddOnProps extends HelmAddOnUserProps {
  /**
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;
}
/**
 * Defaults options for the add-on
 */
const defaultProps = {
  name: "kro",
  release: "kro",
  namespace: "kro",
  chart: "kro",
  version: KRO_VERSION,
  repository: "oci://registry.k8s.io/kro/charts/kro",
  values: {},
  createNamespace: true
};

@utils.supportsALL
export class KroAddOn extends HelmAddOn {

  readonly options: KroAddOnProps;

  constructor(props?: KroAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as KroAddOnProps;
  }
  
  deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
    let values: Values = this.options.values ?? {};
    values = merge(values, this.props.values ?? {});
    const chart = this.addHelmChart(clusterInfo, values, this.options.createNamespace);

    return Promise.resolve(chart);
  }

}
