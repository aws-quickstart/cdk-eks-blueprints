import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { AwsLoadBalancerControllerAddOn } from "..";
import { ClusterInfo } from "../../spi";
import { dependable } from "../../utils";
import { setPath } from "../../utils/object-utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";


/**
 * Properties available to configure the nginx ingress controller.
 * Values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#
 */
export interface NginxAddOnProps extends HelmAddOnUserProps {
 
    /**
     * tcp, http
     * @default tcp
     */
    backendProtocol?: string;

    /**
     * Enabling cross AZ loadbalancing for 
     * @default true
     */
    crossZoneEnabled?: boolean;

    /**
     * If the load balancer created for the ingress is internet facing.
     * Internal if set to false.
     * @default true
     */
    internetFacing?: boolean;

    /**
     * IP or instance mode. Default: IP, requires VPC-CNI, has better performance eliminating a hop through kubeproxy
     * Instance mode: traditional NodePort mode on the instance. 
     * @default ip
     */
    targetType?: string;

    /**
     * Used in conjunction with external DNS add-on to handle automatic registration of the service with Route53.  
     */
    externalDnsHostname?: string;

    /**
     * Name of the certificate {@link NamedResourceProvider} to be used for certificate look up. 
     * @see {@link ImportCertificateProvider} and {@link CreateCertificateProvider} for examples of certificate providers.
     */
    certificateResourceName?: string,
}


/**
 * Defaults options for the add-on
 */
const defaultProps: NginxAddOnProps = {
    name: "nginx-ingress",
    chart: "nginx-ingress",
    release: "blueprints-addon-nginx",
    version: "0.17.0",
    repository: "https://helm.nginx.com/stable",
    backendProtocol: 'tcp',
    crossZoneEnabled: true,
    internetFacing: true,
    targetType: 'ip',
    namespace: 'kube-system'
};

export class NginxAddOn extends HelmAddOn {

    readonly options: NginxAddOnProps;

    constructor(props?: NginxAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props;
    }

    @dependable(AwsLoadBalancerControllerAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        const props = this.options;

        const presetAnnotations: any = {
            'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': props.backendProtocol,
            'service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled': `${props.crossZoneEnabled}`,
            'service.beta.kubernetes.io/aws-load-balancer-scheme': props.internetFacing ? 'internet-facing' : 'internal',
            'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
            'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': props.targetType,
            'external-dns.alpha.kubernetes.io/hostname': props.externalDnsHostname,
        };

        const values = { ...props.values ?? {} };

        if (props.certificateResourceName) {
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-ports'] = 'https';
            const certificate = clusterInfo.getResource<ICertificate>(props.certificateResourceName);
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] = certificate?.certificateArn;
            setPath(values, "controller.service.httpsPort.targetPort", "http");
            setPath(values, "controller.service.httpPort.enable", "false");
        }

        const serviceAnnotations = { ...values.controller?.service?.annotations, ...presetAnnotations };
        setPath(values, 'controller.service.annotations', serviceAnnotations);

        const nginxHelmChart = this.addHelmChart(clusterInfo, values);

        return Promise.resolve(nginxHelmChart);
    }
}