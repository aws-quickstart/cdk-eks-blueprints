import { Construct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { dependable, supportsALL } from '../../utils';
import { ISTIO_VERSION } from './istio-base';

/**
 * User provided option for the Helm Chart
 */
export interface IstioCniAddonProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */    
    createNamespace?: boolean;
}

const defaultProps: HelmAddOnProps & IstioCniAddonProps = {
    name: 'istio-cni',
    release: 'cni',
    namespace: 'istio-system',
    chart: 'cni',
    version: ISTIO_VERSION,
    repository: 'https://istio-release.storage.googleapis.com/charts',
    values: {}, 
    createNamespace: false
};

@supportsALL
export class IstioCniAddon extends HelmAddOn {

    constructor(props?: IstioCniAddonProps) {
        super({ ...defaultProps, ...props });
    }

    @dependable('IstioBaseAddOn','IstioControlPlaneAddOn')
    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        
        const chart = this.addHelmChart(clusterInfo, this.props.values);
        return Promise.resolve(chart);
    }
}