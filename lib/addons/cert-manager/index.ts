// lib/certmanager_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { setPath } from '../../utils/object-utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
/**
 * User provided options for the Helm Chart
 */
export interface CertManagerAddOnProps extends HelmAddOnUserProps {
    /**
     * To automatically install and manage the CRDs as part of your Helm release,
     */    
    installCRDs?: boolean;
    /**
     * To Create Namespace using CDK
     */    
    createNamespace?: boolean;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & CertManagerAddOnProps = {
  name: "blueprints-cert-manager-addon",
  namespace: "cert-manager",
  chart: "cert-manager",
  version: "1.10.1",
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
function populateValues(helmOptions: CertManagerAddOnProps): Values {
  const values = helmOptions.values ?? {};
  setPath(values, "installCRDs",  helmOptions.installCRDs);
  return values;
}
