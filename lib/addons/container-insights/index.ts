import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { Construct } from "@aws-cdk/core";
import merge from "ts-deepmerge";
import { assertEC2NodeGroup } from "../..";
import { ClusterInfo } from "../../spi";
import { createNamespace, createServiceAccountWithPolicy } from "../../utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ValuesSchema } from "./values";

export interface ContainerInsightAddonProps extends HelmAddOnUserProps {
    values?: ValuesSchema
}

const defaultProps = {
    name: "adot-exporter-for-eks-on-ec2",
    namespace: "amazon-cloudwatch",
    chart: "adot-exporter-for-eks-on-ec2",
    version: "0.1.0",
    release: "adot-eks-release",
    repository: "https://aws-observability.github.io/aws-otel-helm-charts"
};


export class ContainerInsightsAddOn extends HelmAddOn {

    constructor(props?: ContainerInsightAddonProps) {
        super({ ...defaultProps, ...props });
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;        
        assertEC2NodeGroup(clusterInfo, ContainerInsightsAddOn.name);

        const namespace = createNamespace(this.props.namespace, clusterInfo.cluster, true);
        const policy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');
        const sa = createServiceAccountWithPolicy(cluster, "adot-eks-sa", this.props.namespace, policy);
        sa.node.addDependency(namespace);
        
        let values: ValuesSchema = {
            awsRegion: cluster.stack.region,
            clusterName: cluster.clusterName,
            
            serviceAccount: {
                create: false,
                name: sa.serviceAccountName
            },
            global: {
                namespaceOverride: this.props.namespace
            }
        };

        values = merge(values, this.props.values ?? {});
        
        const chart = this.addHelmChart(clusterInfo, values);
        chart.node.addDependency(sa);
        return Promise.resolve(chart);
    }
}