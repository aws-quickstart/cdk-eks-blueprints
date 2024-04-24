// Import necessary AWS CDK and utility modules
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { merge } from "ts-deepmerge";
import * as dot from 'dot-object';
import { dependable, supportsALL } from "../../utils";
import { setPath } from "../../utils/object-utils";
import { ClusterInfo, Values } from "../../spi";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { AwsLoadBalancerControllerAddOn } from ".."

// Define the properties for the Kubernetes Ingress Add-On with optional and required settings
export interface KubernetesIngressAddOnProps extends HelmAddOnUserProps {
    backendProtocol?: string;
    crossZoneEnabled?: boolean;
    internetFacing?: boolean;
    targetType?: string;
    externalDnsHostname?: string;
    certificateDomainName?: string;
    ingressClassName?: string;
    controllerClass?: string;
    electionId?: string;
    isDefaultClass?: boolean;
    certificateResourceName?: string;
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

        // Log for debugging: shows the certificate domain name used
        // console.log("Using certificate domain name: ", props.certificateDomainName);

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

        // Create a certificate if a domain name is provided
        if (props.certificateDomainName) {
            const certificate = new Certificate(clusterInfo.cluster, 'MyCertificate', {
                domainName: props.certificateDomainName,
            });
            console.log("Certificate ARN:", certificate.certificateArn);
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] = certificate.certificateArn;
        }

        // Configure SSL-related annotations if certificate resource name is provided
        if (props.certificateResourceName) {
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-ports'] = 'https';
            presetAnnotations['service.beta.kubernetes.io/aws-load-balancer-ssl-cert'] = props.certificateResourceName;
            presetAnnotations['nginx.ingress.kubernetes.io/force-ssl-redirect'] = true;

            // Set HTTP and HTTPS target ports
            setPath(values, "controller.service.targetPorts.http", "http");
            const httpsTargetPort = dot.pick("controller.service.targetPorts.https", props.values) || "http";
            setPath(values, "controller.service.targetPorts.https", httpsTargetPort);
        }

        // Merge user-defined values with defaults for the Helm chart deployment
        const mergedValues = merge(values, this.props.values ?? {});
        const nginxHelmChart = this.addHelmChart(clusterInfo, mergedValues);

        return Promise.resolve(nginxHelmChart);
    }
}
