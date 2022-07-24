// lib/certmanager_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { setPath } from '../../utils/object-utils';
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
/**
 * User provided options for the Helm Chart
 */
export interface CertManagerAddOnProps extends HelmAddOnUserProps {
  version?: string,
  installCRDs?: boolean
  createNamespace?: boolean
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & CertManagerAddOnProps = {
  name: "blueprints-cert-manager-addon",
  namespace: "cert-manager",
  chart: "cert-manager",
  version: "1.8",
  release: "cert-manager",
  repository:  "https://charts.jetstack.io",
  values: {},
  installCRDs: true, //To automatically install and manage the CRDs as part of your Helm release,
  createNamespace: true

};

/**
 * Main class to instantiate the Helm chart
 */
export class CertManagerAddOn extends HelmAddOn {

  readonly options: CertManagerAddOnProps;

  constructor(props?: CertManagerAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as CertManagerAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    
    if( this.options.createNamespace == true){
      createNamespace(this.options.namespace! , cluster);
    }
    
    let values: Values = populateValues(this.options);
    values = merge(values, this.props.values ?? {});
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: CertManagerAddOnProps): Values {
  const values = helmOptions.values ?? {};
  setPath(values, "installCRDs",  helmOptions.installCRDs);
  return values;
}
