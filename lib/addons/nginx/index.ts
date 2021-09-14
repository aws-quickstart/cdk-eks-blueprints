import { Construct } from "@aws-cdk/core";
import { Constants } from "..";
import { ClusterAddOn, ClusterInfo } from "../../spi";


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
     * Values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#
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
    values: {}
};

export class NginxAddOn implements ClusterAddOn {

    readonly options: NginxAddOnProps;

    constructor(props?: NginxAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        const props = this.options;
        const dependencies = Array<Promise<Construct>>();
        const awsLoadBalancerControllerAddOnPromise = clusterInfo.getScheduledAddOn('AwsLoadBalancerControllerAddOn');
        
        console.assert(awsLoadBalancerControllerAddOnPromise, 'NginxAddOn has a dependency on AwsLoadBalancerControllerAddOn');
        dependencies.push(awsLoadBalancerControllerAddOnPromise!);

        if (props.externalDnsHostname) {
            const externalDnsAddOnPromise = clusterInfo.getScheduledAddOn('ExternalDnsAddon');
            console.assert(externalDnsAddOnPromise, 'NginxAddOn has a dependency on ExternalDnsAddOn');
            dependencies.push(externalDnsAddOnPromise!);
        }

        const presetAnnotations = {
            'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': props.backendProtocol,
            'service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled': `${props.crossZoneEnabled}`,
            'service.beta.kubernetes.io/aws-load-balancer-scheme': props.internetFacing ? 'internet-facing' : 'internal',
            'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
            'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': props.targetType,
            'external-dns.alpha.kubernetes.io/hostname': props.externalDnsHostname,
        };

        const values = props.values ?? {};
        const serviceAnnotations = { ...values.controller?.service?.annotations, ...presetAnnotations };

        values['controller'] = {
            service: {
                annotations: serviceAnnotations
            }
        };

        const nginxHelmChart = clusterInfo.cluster.addHelmChart("nginx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            release: Constants.SSP_ADDON,
            namespace: props.namespace,
            version: props.version,
            values
        });

        Promise.all(dependencies.values()).then((constructs) => {
            constructs.forEach((construct) => {
                nginxHelmChart.node.addDependency(construct);
            });
        }).catch(err => { throw new Error(err) });
    }
}