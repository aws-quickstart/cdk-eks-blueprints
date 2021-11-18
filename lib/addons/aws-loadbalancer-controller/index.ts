import * as iam from "@aws-cdk/aws-iam";
import { Construct } from "@aws-cdk/core";
import { ClusterInfo } from "../../spi";
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
    enableWafv2?: boolean
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
    version: '1.2.3',
    enableShield: false,
    enableWaf: false,
    enableWafv2: false
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

        AwsLoadbalancerControllerIamPolicy.Statement.forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

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
        });

        awsLoadBalancerControllerChart.node.addDependency(serviceAccount);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(awsLoadBalancerControllerChart);
    }
}