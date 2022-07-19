// filename=lib/kubevious_addon.ts
import 'source-map-support/register';
import * as blueprints from '../../../lib';
import { Construct } from 'constructs';
import { setPath } from '../../utils';

/**
 * User provided options for the Helm Chart
 */
export interface FlaggerAddOnProps extends blueprints.HelmAddOnUserProps {
  version?: string,
  ingressEnabled?: boolean,
  flaggerServiceType?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
export const defaultProps: blueprints.HelmAddOnProps & FlaggerAddOnProps = {
  name: "flagger-progressive-delivery", // Internal identifyer for our add-on
  namespace: "flagger",          // Namespace used to deploy the chart
  chart: "flagger",            // Name of the Chart to be deployed
  version: "1.0",            // version of the chart 
  release: "flagger",            // Name for our chart in Kubernetes
  repository: "https://flagger.io",        // HTTPS address of the chart repository
  values: {},              // Additional chart values  

  ingressEnabled: false,
  flaggerServiceType: "ClusterIP",
}

/**
 * Main class to instantiate the Helm chart
 */
export class FlaggerAddOn extends blueprints.HelmAddOn {

  readonly options: FlaggerAddOnProps

  constructor(props: FlaggerAddOnProps) {
    super({ ...defaultProps, ...props });
    this.options = this.props as FlaggerAddOnProps;
  }

  deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
    let values: blueprints.Values = populateValues(this.options);

    const chart = this.addHelmChart(clusterInfo, values);

    return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: FlaggerAddOnProps): blueprints.Values {
  const values = helmOptions.values ?? {};

  setPath(values, "ingress.enabled", helmOptions.ingressEnabled);
  setPath(values, "flagger.service.type", helmOptions.flaggerServiceType);
  setPath(values, "mysql.generate_passwords", true);

  return values;
}
