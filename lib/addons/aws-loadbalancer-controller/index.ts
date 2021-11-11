import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import request from "sync-request";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Construct } from "@aws-cdk/core";

/**
 * Configuration options for the add-on.
 */
export interface AwsLoadBalancerControllerProps {

    /**
     * Namespace where controller will be installed
     */
    namespace?: string,

    /**
     * Version of the controller, i.e. v2.2.0 
     */
    version?: string,

    /**
     * Helm chart version to use to install. Expected to match the controller version, e.g. v2.2.0 maps to 1.2.0
     */
    chartVersion?: string,

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
    enableWafv2?: boolean
}

/**
 * Defaults options for the add-on
 */
const defaultProps: AwsLoadBalancerControllerProps = {
    namespace: 'kube-system',
    version: 'v2.2.1',
    chartVersion: '1.2.3',
    enableShield: false,
    enableWaf: false,
    enableWafv2: false
}

const AWS_LOAD_BALANCER_CONTROLLER = 'aws-load-balancer-controller';

export class AwsLoadBalancerControllerAddOn implements ClusterAddOn {

    private options: AwsLoadBalancerControllerProps;

    constructor(props?: AwsLoadBalancerControllerProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const serviceAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: AWS_LOAD_BALANCER_CONTROLLER,
            namespace: this.options.namespace,
        });

        const awsControllerBaseResourceBaseUrl = `https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/${this.options.version}/docs`;
        const awsControllerPolicyUrl = `${awsControllerBaseResourceBaseUrl}/install/iam_policy${cluster.stack.region.startsWith('cn-') ? '_cn' : ''}.json`;

        const policyJson = request('GET', awsControllerPolicyUrl).getBody().toString();

        ((JSON.parse(policyJson)).Statement as []).forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        const awsLoadBalancerControllerChart = cluster.addHelmChart('AWSLoadBalancerController', {
            chart: AWS_LOAD_BALANCER_CONTROLLER,
            repository: 'https://aws.github.io/eks-charts',
            namespace: this.options.namespace,
            release: AWS_LOAD_BALANCER_CONTROLLER,
            version: this.options.chartVersion,
            wait: true,
            timeout: cdk.Duration.minutes(15),
            values: {
                clusterName: cluster.clusterName,
                serviceAccount: {
                    create: false,
                    name: serviceAccount.serviceAccountName,
                },
                // must disable waf features for aws-cn partition
                enableShield: this.options.enableShield,
                enableWaf: this.options.enableWaf,
                enableWafv2: this.options.enableWafv2,
            },
        });

        awsLoadBalancerControllerChart.node.addDependency(serviceAccount);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(awsLoadBalancerControllerChart);
    }
}