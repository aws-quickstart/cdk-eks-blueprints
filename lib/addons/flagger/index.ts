import 'source-map-support/register';
import * as blueprints from '../../../lib';
import { Construct } from 'constructs';

/**
 * User provided options for the Helm Chart
 */
 export interface FlaggerAddOnProps extends blueprints.HelmAddOnUserProps {
  version?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: blueprints.HelmAddOnProps & FlaggerAddOnProps = {
  name: "flagger",
  namespace: "flagger",
  chart: "flagger",
  version: "1.0",
  release: "flagger",
  repository:  "",
  values: {},

};

/**
 * Main class to instantiate the Helm chart
 */
export class FlaggerAddOn extends blueprints.HelmAddOn {

  readonly options: FlaggerAddOnProps;

  constructor(props?: FlaggerAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as FlaggerAddOnProps;
  }

  deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
    const chart = this.addHelmChart(clusterInfo);

    return Promise.resolve(chart);
  }
}