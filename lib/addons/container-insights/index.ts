import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import merge from "ts-deepmerge";
import { assertEC2NodeGroup } from "../..";
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ValuesSchema } from "./values";
import { conflictsWith, createNamespace } from "../../utils";

export interface ContainerInsightAddonProps extends Omit<HelmAddOnUserProps, "namespace"> {
    values?: ValuesSchema
}

const defaultProps = {
    name: "adot-exporter-for-eks-on-ec2",
    namespace: undefined, // the chart will choke if this value is set
    chart: "adot-exporter-for-eks-on-ec2",
    version: "0.15.0",
    release: "adot-eks-addon",
    repository: "https://aws-observability.github.io/aws-otel-helm-charts"
};

export class ContainerInsightsAddOn extends HelmAddOn {

    constructor(props?: ContainerInsightAddonProps) {
        super({ ...defaultProps, ...props });
    }

    /**
     * @override
     */
    @conflictsWith("AdotCollectorAddOn")
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;        
        const nodeGroups = assertEC2NodeGroup(clusterInfo, ContainerInsightsAddOn.name);
        const policy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');
        
        nodeGroups.forEach(nodeGroup => {
            nodeGroup.role.addManagedPolicy(policy);
        });

        // Create an adot-collector service account.
        const serviceAccountName = "adot-collector-sa";
        let serviceAccountNamespace;

        if (this.props.namespace) {
            serviceAccountNamespace = this.props.namespace;
        }
        else {
            serviceAccountNamespace = "amazon-metrics";
        }

        const ns = createNamespace(serviceAccountNamespace, cluster, true);
        const sa = cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: serviceAccountNamespace,
        });

        // Apply Managed IAM policy to the service account.
        sa.role.addManagedPolicy(policy);
        sa.node.addDependency(ns);

        let values: ValuesSchema = {
            awsRegion: cluster.stack.region,
            clusterName: cluster.clusterName,
            serviceAccount: {
                create: false,
            },
            adotCollector: {
                daemonSet: {
                    createNamespace: false,
                    service: {
                        metrics: {
                            receivers: ["awscontainerinsightreceiver"],
                            exporters: ["awsemf"],
                        }
                    },
                    serviceAccount: {
                        create: false,
                    },
                    cwexporters: {
                        logStreamName: "EKSNode",
                    }
                }
            }
        };

        values = merge(values, this.props.values ?? {});
        
        const chart = this.addHelmChart(clusterInfo, values, true, false);
        chart.node.addDependency(sa);
        return Promise.resolve(chart);
    }
}