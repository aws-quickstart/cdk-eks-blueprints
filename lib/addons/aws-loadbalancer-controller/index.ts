import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import request from 'sync-request';
import { ClusterAddOn, ClusterInfo } from "../../spi";

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

    private props: AwsLoadBalancerControllerProps;

    constructor(props?: AwsLoadBalancerControllerProps) {
        this.props = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        const serviceAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: AWS_LOAD_BALANCER_CONTROLLER,
            namespace: this.props.namespace,
        });

        const awsControllerBaseResourceBaseUrl = `https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/${this.props.version}/docs`;
        const awsControllerPolicyUrl = `${awsControllerBaseResourceBaseUrl}/install/iam_policy${cluster.stack.region.startsWith('cn-') ? '_cn' : ''}.json`;

        const policyJson = request('GET', awsControllerPolicyUrl).getBody().toString();

        ((JSON.parse(policyJson)).Statement as []).forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        const awsLoadBalancerControllerChart = cluster.addHelmChart('AWSLoadBalancerController', {
            chart: AWS_LOAD_BALANCER_CONTROLLER,
            repository: 'https://aws.github.io/eks-charts',
            namespace: this.props.namespace,
            release: AWS_LOAD_BALANCER_CONTROLLER,
            version: this.props.chartVersion,
            wait: true,
            timeout: cdk.Duration.minutes(15),
            values: {
                clusterName: cluster.clusterName,
                serviceAccount: {
                    create: false,
                    name: serviceAccount.serviceAccountName,
                },
                // must disable waf features for aws-cn partition
                enableShield: this.props.enableShield,
                enableWaf: this.props.enableWaf,
                enableWafv2: this.props.enableWafv2,
            },
        });

        awsLoadBalancerControllerChart.node.addDependency(serviceAccount);
    }
}