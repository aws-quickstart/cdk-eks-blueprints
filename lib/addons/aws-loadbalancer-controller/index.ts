import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { ClusterInfo, Values } from "../../spi";
import { registries } from "../../utils/registry-utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { AwsLoadbalancerControllerIamPolicy } from "./iam-policy";

/**
 * Configuration options for the add-on.
 */
export interface AwsLoadBalancerControllerProps extends HelmAddOnUserProps {

    /**
     * Enable Shield (must be false for CN partition)
     */
    enableShield?: boolean,

    /**
     * Enable WAF (must be false for CN partition)
     */
    enableWaf: boolean,

    /**
     * Enable WAFV2 (must be false for CN partition)
     */
    enableWafv2?: boolean,

    /**
     * Create the ingressClass to be used by the ALB controller
     */
    createIngressClassResource?: boolean

    /**
     * Name of ingressClass to the ALB controller will satisfy. If not provided
     * the value will be defaulted to "alb"
     */
    ingressClass?: string
}


const AWS_LOAD_BALANCER_CONTROLLER = 'aws-load-balancer-controller';

/**
 * Defaults options for the add-on
 */
const defaultProps: AwsLoadBalancerControllerProps = {
    name: AWS_LOAD_BALANCER_CONTROLLER,
    namespace: 'kube-system',
    chart: AWS_LOAD_BALANCER_CONTROLLER,
    repository: 'https://aws.github.io/eks-charts',
    release: AWS_LOAD_BALANCER_CONTROLLER,
    version: '1.4.7',
    enableShield: false,
    enableWaf: false,
    enableWafv2: false,
    createIngressClassResource: true,
    ingressClass: "alb"
};


function lookupImage(registry?: string, region?: string): Values {
    if(registry ==  null) {
        console.log("Unable to get ECR repository for AWS Loadbalancer Controller for region " + region) + ". Using default helm image";
        return {};
    }
    
    return { image : { repository: registry + "amazon/aws-load-balancer-controller" }};
}

export class AwsLoadBalancerControllerAddOn extends HelmAddOn {

    readonly options: AwsLoadBalancerControllerProps;

    constructor(props?: AwsLoadBalancerControllerProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props as AwsLoadBalancerControllerProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const serviceAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: AWS_LOAD_BALANCER_CONTROLLER,
            namespace: this.options.namespace,
        });

        AwsLoadbalancerControllerIamPolicy(cluster.stack.partition).Statement.forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });
    
        const registry = registries.get(cluster.stack.region);
        
        const image = lookupImage(registry, cluster.stack.region);
        
        const awsLoadBalancerControllerChart = this.addHelmChart(clusterInfo, {
            clusterName: cluster.clusterName,
            serviceAccount: {
                create: false,
                name: serviceAccount.serviceAccountName,
            },
            // must disable waf features for aws-cn partition
            enableShield: this.options.enableShield,
            enableWaf: this.options.enableWaf,
            enableWafv2: this.options.enableWafv2,
            createIngressClassResource: this.options.createIngressClassResource,
            ingressClass: this.options.ingressClass,
            region: clusterInfo.cluster.stack.region,
            ...image,
            vpcId: clusterInfo.cluster.vpc.vpcId,
        });

        awsLoadBalancerControllerChart.node.addDependency(serviceAccount);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(awsLoadBalancerControllerChart);
    }
}