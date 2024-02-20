import { Construct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnProps } from "../helm-addon";
import { dependable, supportsALL } from '../../utils';
import { ISTIO_VERSION } from './istio-base';

const defaultProps: HelmAddOnProps = {
    name: 'istio-ingressgateway',
    release: 'ingressgateway',
    namespace: 'istio-system',
    chart: 'gateway',
    version: ISTIO_VERSION,
    repository: 'https://istio-release.storage.googleapis.com/charts',
    values: {},
};

@supportsALL
export class IstioIngressGatewayAddon extends HelmAddOn {

    constructor() { 
        super({...defaultProps});
    }
    @dependable('IstioBaseAddOn','IstioControlPlaneAddOn')
    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const chart = this.addHelmChart(clusterInfo, this.props.values);
        return Promise.resolve(chart);
    }
}