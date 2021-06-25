import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";


export interface NginxAddOnProps {
    /**
     * tcp, http
     */
    backendProtocol?: string,

    crossZoneEnabled?: boolean,

    internetFacing?: boolean,

    /**
     * IP or instance mode. Default: IP, requires VPC-CNI, has better performance eliminating a hop through kubeproxy
     * Instance mode: traditional NodePort mode on the instance. 
     */
    targetType?: string,

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
    targetType: 'ip'
}


export class NginxAddOn implements ClusterAddOn {

/* 
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: 'true'
    
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
*/  

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("nginx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system",
            version: "0.9.3",
            values: {}
        });
    }
}