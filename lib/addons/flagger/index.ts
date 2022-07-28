import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { Construct } from 'constructs';
import { Values, ClusterInfo } from "../../spi";
import merge from "ts-deepmerge";

/**
 * User provided options for the FlaggerAddonProps values.
 */
export interface FlaggerAddOnProps extends HelmAddOnUserProps {
  installPrometheus?: boolean;
  meshProvider?: MeshProviderOptions;
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
export const defaultProps: HelmAddOnProps & FlaggerAddOnProps = {
  name: "flagger",
  namespace: "flagger",
  chart: "flagger",
  version: "1.22.0",
  release: "flagger",
  repository: "https://flagger.app",
  values: {
    prometheus: {
      install: true
    },
    meshProvider: MeshProviderOptions.KUBERNETES
  }
};

/**
 * This creates and deploys a cluster with the FlaggerAddOnProps values for flagger settings with preset values unless the user specifies their own values.
 */
export class FlaggerAddOn extends HelmAddOn{

  readonly options: FlaggerAddOnProps;

  constructor(props?: FlaggerAddOnProps) {
    super({ ...defaultProps, ...props });
    this.options = this.props as FlaggerAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    let values: Values = {
      prometheus: {
        install: this.options.installPrometheus ?? defaultProps.installPrometheus
      },
      meshProvider: this.options.meshProvider ?? defaultProps.meshProvider
    };
    values = merge(values, this.props.values ?? {});
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }
}