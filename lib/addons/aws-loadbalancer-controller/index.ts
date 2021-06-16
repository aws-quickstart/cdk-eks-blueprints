import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { ClusterAddOn, ClusterInfo } from "../../stacks";
import request from 'sync-request';

/**
 * Configuration options for AWS Load Balancer controller
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
 * Defaults options for load balancer controller.
 */
const AwsLoadBalancerControllerDefaults: AwsLoadBalancerControllerProps = {
    namespace: 'kube-system',
    version: 'v2.2.0',
    enableShield: false,
    enableWaf: false,
    enableWafv2: false
}

const AWS_LOAD_BALANCER_CONTROLLER = 'aws-load-balancer-controller';

export class AwsLoadBalancerControllerAddOn implements ClusterAddOn {

    private options: AwsLoadBalancerControllerProps;

    constructor(props?: AwsLoadBalancerControllerProps) {
        this.options = { ...AwsLoadBalancerControllerDefaults, ...props ?? {}};
    }

    deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster; 
        const awsControllerBaseResourceBaseUrl = `https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/${this.options.version}/docs`;
        const awsControllerPolicyUrl = `${awsControllerBaseResourceBaseUrl}/install/iam_policy${cluster.stack.region.startsWith('cn-') ? '_cn' : ''}.json`;
        
        const serviceAccount = cluster.addServiceAccount('aws-load-balancer-controller', {
            name: AWS_LOAD_BALANCER_CONTROLLER,
            namespace: this.options.namespace,
        });

        const policyJson = request('GET', awsControllerPolicyUrl).getBody().toString();
        
        ((JSON.parse(policyJson)).Statement as []).forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        const awsLoadBalancerControllerChart = cluster.addHelmChart('AWSLoadBalancerController', {
            chart: AWS_LOAD_BALANCER_CONTROLLER,
            repository: 'https://aws.github.io/eks-charts',
            namespace: this.options.namespace,
            release: 'aws-load-balancer-controller',
            version: '1.2.0', // mapping to v2.2.0
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
    }
}