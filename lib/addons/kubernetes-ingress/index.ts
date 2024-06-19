// Import necessary AWS CDK and utility modules
import { Certificate, ICertificate  } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { merge } from "ts-deepmerge";
import * as dot from 'dot-object';
import { dependable, supportsALL } from "../../utils";
import { setPath } from "../../utils/object-utils";
import { ClusterInfo, Values } from "../../spi";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { AwsLoadBalancerControllerAddOn } from ".."

/**
 * Properties available to configure the nginx ingress controller.
 * Values to pass to the chart as per https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
 */
export interface KubernetesIngressAddOnProps extends HelmAddOnUserProps {
    /**
     * The name of the Kubernetes Ingress Helm release.
     */
    name?: string;

    /**
     * The name of the chart within the Helm release.
     */
    chart?: string;

    /**
     * Unique identifier for the release.
     */
    release?: string;

    /**
     * Specific version of the chart to be deployed.
     */
    version?: string;

    /**
     * URL of the chart repository.
     */
    repository?: string;

    /**
     * Kubernetes namespace where the ingress controller will be installed.
     * @default 'kube-system'
     */
    namespace?: string;

    /**
     * Custom values passed to the Helm chart.
     */
    values?: Values;

    /**
     * Specifies the protocol used by the load balancer.
     * HTTP, HTTPS, AUTO_HTTP, GRPC, GRPCS, and FCGI are supported.
     * @default 'http'
     */
    backendProtocol?: string;

    /**
     * Determines whether cross-zone load balancing is enabled for the load balancer.
     * @default true
     */
    crossZoneEnabled?: boolean;

    /**
     * Indicates whether the load balancer is exposed to the internet.
     * Set to false for an internal load balancer.
     * @default true
     */
    internetFacing?: boolean;

    /**
     * Specifies how traffic is routed to pods. Can be either 'ip' or 'instance'.
     * 'ip' mode is more performant and requires VPC-CNI.
     * @default 'ip'
     */
    targetType?: string;

    /**
     * Hostname to be used with external DNS services for automatic DNS configuration.
     */
    externalDnsHostname?: string;

    /**
     * Specifies the class of the ingress controller. Used to differentiate between multiple ingress controllers.
     * @default 'nginx'
     */
    ingressClassName?: string;

    /**
     * Specifies the controller class used for handling ingress in a cluster.
     */
    controllerClass?: string;

    /**
     * Identifier used for leader election during the deployment of multiple ingress controllers.
     */
    electionId?: string;

    /**
     * Determines if the ingress controller should be set as the default controller for handling ingress resources.
     * @default false
     */
    isDefaultClass?: boolean;

    /**
     * Name of the certificate {@link NamedResourceProvider} to be used for certificate look up. 
     * @see {@link ImportCertificateProvider} and {@link CreateCertificateProvider} for examples of certificate providers.
     */
    certificateResourceName?: string;

    /**
     * ARN of the AWS Certificate Manager certificate to be used for HTTPS.
     */
    certificateResourceARN?: string;

    /**
     * ARN of the AWS Certificate Manager certificate to be used for HTTPS.
     * @default "3600"
     */
    idleTimeout?: string;
}

// Set default properties for the add-on
const defaultProps: KubernetesIngressAddOnProps = {
    name: "kubernetes-ingress",
    chart: "ingress-nginx",
    release: "k8s-ingress",
    version: "4.10.0",
    repository: "https://kubernetes.github.io/ingress-nginx",
    backendProtocol: 'http',
    crossZoneEnabled: true,
    internetFacing: true,
    targetType: 'ip',
    namespace: 'kube-system',
    idleTimeout: '3600'
};

// Define the class for the Kubernetes Ingress Add-On, extending HelmAddOn
@supportsALL
export class KubernetesIngressAddOn extends HelmAddOn {
    private readonly options: KubernetesIngressAddOnProps;

    // Constructor for the class, merging default props with user-defined props
    constructor(props?: KubernetesIngressAddOnProps) {
        super({ ...defaultProps, ...props } as HelmAddOnProps);
        this.options = { ...defaultProps, ...props } as KubernetesIngressAddOnProps;
    }

    // Dependency decorator to ensure this add-on is deployed after the AWS Load Balancer Controller
    @dependable(AwsLoadBalancerControllerAddOn.name)
    async deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const props = this.options;



        // Setup service annotations based on the properties provided
        const presetAnnotations: any = {
            'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': props.backendProtocol,
            'service.beta.kubernetes.io/aws-load-balancer-attributes': `load_balancing.cross_zone.enabled=${props.crossZoneEnabled}`,
            'service.beta.kubernetes.io/aws-load-balancer-scheme': props.internetFacing ? 'internet-facing' : 'internal',
            'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
            'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': props.targetType,
            'external-dns.alpha.kubernetes.io/hostname': props.externalDnsHostname,
            'service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout': '3600'
            
            
        };

        // Define values for Helm chart based on properties and annotations
        const values: Values = {
            controller: {
                service: {
                    annotations: presetAnnotations
                },
                ingressClassResource: {
                    name: props.ingressClassName || "nginx",
                    enabled: true,
                    default: props.isDefaultClass ?? false,
                    controllerValue: props.controllerClass || "k8s.io/ingress-nginx"
                },
                electionID: props.electionId || "ingress-controller-leader"
            }
        };

        // Configure SSL-related annotations if certificate resource name is provided
        if (props.certificateResourceName) {
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-ports'] = 'https';
            const certificate = clusterInfo.getResource<ICertificate>(props.certificateResourceName);
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] = certificate?.certificateArn;
            presetAnnotations['nginx.ingress.kubernetes.io/force-ssl-redirect'] = true;
        }

        // Configure SSL-related annotations if certificate resource name is provided
        if (props.certificateResourceARN) {
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-ports'] = 'https';
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] = props.certificateResourceARN;
            presetAnnotations['nginx.ingress.kubernetes.io/force-ssl-redirect'] = true;
        }

        // Set HTTP and HTTPS target ports
        setPath(values, "controller.service.targetPorts.http", "http");
        const httpsTargetPort = dot.pick("controller.service.targetPorts.https", props.values) || "http";
        setPath(values, "controller.service.targetPorts.https", httpsTargetPort);

        // Merge user-defined values with defaults for the Helm chart deployment
        const mergedValues = merge(values, this.props.values ?? {});
        const nginxHelmChart = this.addHelmChart(clusterInfo, mergedValues);

        return Promise.resolve(nginxHelmChart);
    }
}
