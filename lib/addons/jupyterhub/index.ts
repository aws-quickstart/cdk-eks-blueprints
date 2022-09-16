import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { createNamespace, dependable, setPath } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

/**
 * Configuration options for the add-on.
 */
export interface JupyterHubAddOnProps extends HelmAddOnUserProps {

    /**
     * Configurations necessary to use EBS as Persistent Volume
     * Defines storageClass for EBS Volume type, and
     * capacity for storage capacity
     */
    ebsConfig: {
        storageClass: string,
        capacity: string,
    }

    /**
     * Configuration settings for OpenID Connect authentication protocol
     */
    oidcConfig?: {
        callbackUrl: string,
        authUrl: string,
        tokenUrl: string,
        userDataUrl: string,
        clientId: string,
        clientSecret: string,
        scope: string[],
        usernameKey: string,
    }

    /**
     * Flag to use Ingress instead of LoadBalancer to expose JupyterHub
     * This will enable ALB and will require Load Balancer Controller add-on
     */
    enableIngress?: boolean
}

const JUPYTERHUB = 'jupyterhub';
const RELEASE = 'blueprints-addon-jupyterhub';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: JUPYTERHUB,
    namespace: JUPYTERHUB,
    version: '1.2.0',
    chart: JUPYTERHUB,
    release: RELEASE,
    repository: 'https://jupyterhub.github.io/helm-chart/',
    values: {}
};

/**
 * Implementation of the JupyterHub add-on
 */
export class JupyterHubAddOn extends HelmAddOn {

    readonly options: JupyterHubAddOnProps;

    constructor(props?: JupyterHubAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as JupyterHubAddOnProps;
    }

    @dependable('EbsCsiDriverAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values = this.options.values ?? {};
        
        // Create persistent storage with EBS
        const storageClass = this.options.ebsConfig.storageClass || "";
        const capacity = this.options.ebsConfig.capacity || "";
        setPath(values, "singleuser.storage.dynamic.storageClass", storageClass);
        setPath(values, "singleuser.storage.capacity", capacity);

        // OpenID Connect authentication setup
        if (this.options.oidcConfig){
            setPath(values, "hub.config.GenericOAuthenticator", {
                "client_id": this.options.oidcConfig.clientId,
                "client_secret": this.options.oidcConfig.clientSecret,
                "oauth_callback_url": this.options.oidcConfig.callbackUrl,
                "authorize_url": this.options.oidcConfig.authUrl,
                "token_url": this.options.oidcConfig.tokenUrl,
                "userdata_url": this.options.oidcConfig.userDataUrl,
                scope:  this.options.oidcConfig.scope,
                username_key:  this.options.oidcConfig.usernameKey,
            });
            setPath(values, "hub.config.JupyterHub.authenticator_class", "generic-oauth");
        }

        // Ingress instead of LoadBalancer service to expose the proxy - leverages AWS ALB
        // If not, then it will leverage AWS NLB
        const enableIngress = this.options.enableIngress || false;
        setPath(values, "ingress.enabled", enableIngress);

        if (enableIngress){
            setPath(values, "ingress.annotations", 
                {
                    "kubernetes.io/ingress.class": "alb",
                    "alb.ingress.kubernetes.io/scheme": "internet-facing",
                    "alb.ingress.kubernetes.io/target-type": "ip",
                }
            );
            setPath(values, "proxy.service.type", "NodePort");
        } else {
            setPath(values, "proxy.service.annotations",
                {
                    "service.beta.kubernetes.io/aws-load-balancer-type": "external",
                    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip",
                    "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
                }
            );
        }

        // Create Namespace
        const ns = createNamespace(this.options.namespace!, cluster, true, true);

        // Create Helm Chart
        const jupyterHubChart = this.addHelmChart(clusterInfo, values, false, true);

        // Add dependency
        jupyterHubChart.node.addDependency(ns);
        return Promise.resolve(jupyterHubChart);
    }
}