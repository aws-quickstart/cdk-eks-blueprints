import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils/namespace-utils";
import merge from "ts-deepmerge";

/**
 * Configuration options for the add-on.
 */
export interface IstioBaseAddOnProps extends HelmAddOnUserProps {
    /**
    * Enable analysis for istiod.
    * @default false
    */
    enableAnalysis?: boolean;

    /**
    *  Enable the istio base config validation.
    * @default true
    */
    configValidation?: boolean;

    /**
    *  If this is set to true, one Istiod will control remote clusters including CA.
    * @default false
    */
    externalIstiod?: boolean;
  
    /**
    * The address or hostname of the remote pilot
    * @default null
    */
    remotePilotAddress?: string;
  
    /**
    * Validation webhook configuration url
    * For example: https://$remotePilotAddress:15017/validate
    * @default null
    */
    validationURL?: string;
    
    /**
    * For istioctl usage to disable istio config crds in base.
    * @default true
    */
    enableIstioConfigCRDs?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
  enableAnalysis: false,
  configValidation: true,
  externalIstiod: false,
  enableIstioConfigCRDs: false,
  name: "base",
  release: "istio-base",
  namespace: "istio-system",
  chart: "base",
  version: "1.13.3",
  repository: "https://istio-release.storage.googleapis.com/charts"
 };

export class IstioBaseAddOn extends HelmAddOn {

    readonly options: IstioBaseAddOnProps;

    constructor(props?: IstioBaseAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    override deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;

        // Istio Namespace
        createNamespace('istio-system', cluster);
    
        let values: Values = {
          global: {
            istiod: {
              enableAnalysis: this.options.enableAnalysis
            },
            configValidation: this.options.configValidation,
            externalIstiod: this.options.externalIstiod,
            base: {
              enableIstioConfigCRDs: this.options.enableIstioConfigCRDs
            }
          }
        };

        values = merge(values, this.props.values ?? {});
        this.addHelmChart(clusterInfo, values);
    }
}