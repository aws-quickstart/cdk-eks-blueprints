import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ValuesSchema } from "./values";
import { assertEC2NodeGroup } from "../..";
import { createServiceAccountWithPolicy } from "../../utils";
import merge from "ts-deepmerge";

export interface ContainerInsightAddonProps extends HelmAddOnUserProps {
    values?: ValuesSchema
}

const defaultProps = {
    name: "adot-exporter-for-eks-on-ec2",
    namespace: "amazon-cloudwatch",
    chart: "adot-exporter-for-eks-on-ec2",
    version: "0.0.1",
    release: "adot-eks-release",
    repository: "https://aws-observability.github.io/aws-otel-helm-charts"
};


export class ContainerInsightsAddOn extends HelmAddOn {

    constructor(props: ContainerInsightAddonProps) {
        super({ ...defaultProps, ...props });
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;        
        assertEC2NodeGroup(clusterInfo, ContainerInsightsAddOn.name);
        const policy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');
        const sa = createServiceAccountWithPolicy(cluster, "adot-eks-sa", this.props.namespace, policy);
        
        let values: ValuesSchema = {
            region: cluster.stack.region,
            clusterName: cluster.clusterName,
            serviceAccount: {
                create: false,
                name: sa.serviceAccountName
            }
        };

        values = merge(values, this.props.values ?? {});
        
        const chart = this.addHelmChart(clusterInfo, values);
        chart.node.addDependency(sa);
    }
}