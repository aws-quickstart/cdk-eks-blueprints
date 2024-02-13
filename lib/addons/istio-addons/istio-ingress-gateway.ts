import { Construct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnProps } from "../helm-addon";
import { dependable, supportsALL } from '../../utils';

const defaultProps: HelmAddOnProps = {
    name: 'istio-ingressgateway',
    release: 'ingressgateway',
    namespace: 'istio-system',
    chart: 'gateway',
    version: "1.20.1",
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