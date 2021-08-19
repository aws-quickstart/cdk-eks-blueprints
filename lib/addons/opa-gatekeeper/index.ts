import { ClusterAddOn, ClusterInfo } from "../../../lib"; 
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";

/**
 * Properties available to configure OPA Gatekeeper.
 */
 export interface OpaGatekeeperAddOnProps {
    /**
     * Default constraint
     */
    defaultConstraint?: string,

    /**
     * Default policy
     */
    crossZoneEnabled?: boolean,

    /**
     * Default audit functionality 
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

const opagatekeeperAddonDefaults: OpaGatekeeperAddOnProps = {

}


export class OpaGatekeeperAddOn implements OpaGatekeeperAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("OpaGatekeeper-addon", {
            chart: "gatekeeper",
            release: "gatekeeper",
            repository: "https://open-policy-agent.github.io/gatekeeper/charts",
            version: "3.6.0-beta.3",
            namespace: "kube-system"
        });
    }
}