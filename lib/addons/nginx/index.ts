import { ICertificate } from "@aws-cdk/aws-certificatemanager";
import { Construct } from "@aws-cdk/core";
import { Constants } from "..";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { dependable } from "../../utils";
import { setPath } from "../../utils/object-utils";

 
/**
 * Properties available to configure the nginx ingress controller.
 */
export interface NginxAddOnProps {
    /**
     * Version for the Nginx Helm chart.
     * @default 0.9.3
     */
    version?: string;

    /**
     * Namespace for the add-on.
     */
    namespace?: string;

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

    /**
     * Values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#:
     */
    values?: {
        [key: string]: any;
    };
}


/**
 * Defaults options for the add-on
 */
const defaultProps: NginxAddOnProps = {
    version: "0.9.3",
    backendProtocol: 'tcp',
    crossZoneEnabled: true,
    internetFacing: true,
    targetType: 'ip',
    namespace: 'kube-system'
};

export class NginxAddOn implements ClusterAddOn {

    readonly options: NginxAddOnProps;

    constructor(props?: NginxAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }


    @dependable('AwsLoadBalancerControllerAddOn')
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

        const values = { ...props.values ?? {}};

        if(props.certificateResourceName) {
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-ports'] = 'https';
            const certificate = clusterInfo.getResource<ICertificate>(props.certificateResourceName);
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] =  certificate?.certificateArn;
            setPath(values, "controller.service.https.port.targetPort", "http");
            setPath(values, "controller.service.http.port.enable", "false");
        }

        const serviceAnnotations = { ...values.controller?.service?.annotations, ...presetAnnotations };

        setPath(values, 'controller.service.annotations', serviceAnnotations);

        const nginxHelmChart = clusterInfo.cluster.addHelmChart("nginx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            release: Constants.SSP_ADDON,
            namespace: props.namespace,
            version: props.version,
            values
        });
        return Promise.resolve(nginxHelmChart);
    }
}