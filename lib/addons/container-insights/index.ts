import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import merge from "ts-deepmerge";
import { assertEC2NodeGroup } from "../..";
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ValuesSchema } from "./values";

export interface ContainerInsightAddonProps extends Omit<HelmAddOnUserProps, "namespace"> {
    values?: ValuesSchema
}

const defaultProps = {
    name: "adot-exporter-for-eks-on-ec2",
    namespace: undefined, // the chart will choke if this value is set
    chart: "adot-exporter-for-eks-on-ec2",
    version: "0.1.0",
    release: "adot-eks-addon",
    repository: "https://aws-observability.github.io/aws-otel-helm-charts"
};


/**
 * @deprecated Use CloudWatchAdotAddOn.
 */
export class ContainerInsightsAddOn extends HelmAddOn {

    constructor(props?: ContainerInsightAddonProps) {
        super({ ...defaultProps, ...props });
    }

    /**
     * @override
     */
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;        
        const nodeGroups = assertEC2NodeGroup(clusterInfo, ContainerInsightsAddOn.name);

        const policy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');
        
        nodeGroups.forEach(nodeGroup => {
            nodeGroup.role.addManagedPolicy(policy);
        });

        let values: ValuesSchema = {
            awsRegion: cluster.stack.region,
            clusterName: cluster.clusterName,
            fluentbit: {
                enabled: true
            }
        };

        values = merge(values, this.props.values ?? {});
        
        const chart = this.addHelmChart(clusterInfo, values, true, false);
        return Promise.resolve(chart);
    }
}