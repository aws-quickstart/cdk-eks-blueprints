import { Cluster } from "@aws-cdk/aws-eks";
import { Construct } from "@aws-cdk/core";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";

export interface HelmAddOnProps {
    repoUrl: string,
    chart: string, 
    release: string,
    namespace: string
}

type Values = {
    [key: string]: any;
};

export abstract class HelmAddOn implements ClusterAddOn {

    constructor(private readonly props: HelmAddOnProps, readonly id: string) {}
    
    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const namespace = this.getNamespace();
        const values = this.getValues();
        const manifest = this.addHelmChart(clusterInfo.cluster, values);
    }

    protected abstract getNamespace() : { name: string, node: Construct | undefined };

    protected abstract getValues(namespaceNode ?: Construct) : Values;


    protected addHelmChart(cluster: Cluster, values?: Values ) : Construct {
        return cluster.addHelmChart( this.id, {
            namespace: this.props.namespace,
            chart: this.props.chart,
            release: this.props.release,
            values: values
        });
    }

}