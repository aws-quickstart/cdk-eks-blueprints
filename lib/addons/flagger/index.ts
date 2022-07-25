import 'source-map-support/register';
import * as blueprints from '../../../lib';
import { Construct } from 'constructs';
import { Values } from "../../spi";
import merge from "ts-deepmerge";

/**
 * User provided options for the FlaggerAddonProps values.
 */
export interface FlaggerAddOnProps extends blueprints.HelmAddOnUserProps {//this is the root level
  prometheusInstall?: boolean;
  meshProvider?: MeshProviderOptions;
  crd?: boolean;
}

/**
 * All the meshProvider values that can be chosen by the user.
 */
export const enum MeshProviderOptions {
  KUBERNETES = 'kubernetes',
  ISTIO = 'istio',
  LINKERD = 'linkerd',
  APPMESH = 'appmesh',
  CONTOUR = 'contour',
  NGINX = 'nginx',
  GLOO = 'gloo',
  SKIPPER = 'skipper',
  TRAEFIK = 'traefik',
  OSM = 'osm'
}

/**
 * defaultProps makes the flagger namespace and chart.
 */
export const defaultProps: blueprints.HelmAddOnProps & FlaggerAddOnProps = {
  name: "flagger",
  namespace: "flagger",
  chart: "flagger",
  version: "1.22.0",
  release: "flagger",
  repository: "https://flagger.app"
};

/**
 * This creates and deploys a cluster with the prometheus and mesh provider settings set unless the user specifies their own values for them.
 */
export class FlaggerAddOn extends blueprints.HelmAddOn {

  readonly options: FlaggerAddOnProps;

  constructor(props?: FlaggerAddOnProps) {
    super({ ...defaultProps, ...props });
    this.options = this.props as FlaggerAddOnProps;
  }

  deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {

    let values: Values = {
      prometheus: {
        install: this.options.prometheusInstall ?? true
      },
      meshProvider: this.options.meshProvider ?? MeshProviderOptions.KUBERNETES,
      crd: {
        create: this.options.crd ?? true
      }
    };

    values = merge(values, this.props.values ?? {});
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }
}