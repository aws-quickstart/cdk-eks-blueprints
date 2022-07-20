import 'source-map-support/register';
import * as blueprints from '../../../lib';
import { Construct } from 'constructs';

/**
 * User provided options for the Helm Chart
 */
export interface FlaggerAddOnProps extends blueprints.HelmAddOnUserProps {//this is the root level
  prometheusInstall?: boolean;
  //meshProvider?: //need an enums for what you put from values;

}

/**
 * Default props to be used when creating the Helm chart
 */
export const defaultProps: blueprints.HelmAddOnProps & FlaggerAddOnProps = {
  name: "flagger",
  namespace: "flagger",
  chart: "flagger",
  version: "1.22.0",
  release: "flagger",
  repository: "https://flagger.app",
  values: {},
};

/**
 * Main class to instantiate the Helm chart
 */
export class FlaggerAddOn extends blueprints.HelmAddOn {

  readonly options: FlaggerAddOnProps;

  constructor(props?: FlaggerAddOnProps) {
    super({ ...defaultProps, ...props }); //merges your stuff and what they specify. They override our stuff, root level, and values properties
    this.options = this.props as FlaggerAddOnProps;
  }

  deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
    const chart = this.addHelmChart(clusterInfo, defaultProps.values);

    return Promise.resolve(chart);
  }
}