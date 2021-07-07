import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";

/**
 * Properties available to configure the nginx ingress controller.
 */
export interface NginxAddOnProps {
    /**
     * tcp, http
     */
    backendProtocol?: string,

    /**
     * Enabling cross AZ loadbalancing for 
     */
    crossZoneEnabled?: boolean,

    /**
     * If the load balancer created for the ingress is internet facing.
     * Internal if set to false.
     */
    internetFacing?: boolean,

    /**
     * IP or instance mode. Default: IP, requires VPC-CNI, has better performance eliminating a hop through kubeproxy
     * Instance mode: traditional NodePort mode on the instance. 
     */
    targetType?: string,
    
    /**
     * Used in conjunction with external DNS add-on to handle automatic registration of the service with Route53.  
     */
    externaDnsHostname?: string,

    /**
     * Values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#
     */
    values?: {
        [key: string]: any;
    };
}

const nginxAddonDefaults: NginxAddOnProps = {
    backendProtocol: 'tcp',
    crossZoneEnabled: true,
    internetFacing: true,
    targetType: 'ip',
}


export class NginxAddOn implements ClusterAddOn {

    readonly options: NginxAddOnProps;

    constructor(props?: NginxAddOnProps) {
        this.options = { ...nginxAddonDefaults, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {

        const props = this.options;

        const presetAnnotations  = {
            'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': props.backendProtocol,
            'service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled': `${props.crossZoneEnabled}`,
            'service.beta.kubernetes.io/aws-load-balancer-scheme': props.internetFacing ? 'internet-facing' : 'internal',
            'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
            'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': props.targetType,
            'external-dns.alpha.kubernetes.io/hostname': props.externaDnsHostname,
        }

        const values = props.values ?? {};
        const serviceAnnotations = { ...values.controller?.service?.annotations, ...presetAnnotations };

        values['controller'] = {
            service: {
                annotations: serviceAnnotations
            }
        };

        clusterInfo.cluster.addHelmChart("nginx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system",
            version: "0.9.3",
            values
        });
    }
}