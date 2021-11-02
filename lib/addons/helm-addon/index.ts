import { Construct } from "@aws-cdk/core";
import { Values } from "aws-sdk/clients/autoscaling";
import * as spi from "../..";
import { enableGitOps } from "../../config-management";

export interface HelmAddOnProps {
    name: string,
    namespace: string,
    chart: string,
    release: string,
    repository: string,
    values?: Values
}

export abstract class HelmAddOn implements spi.ClusterAddOn {

    constructor(readonly props: HelmAddOnProps) {}
    
    abstract deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct>;

    @enableGitOps()
    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values ) : Construct {
        return clusterInfo.cluster.addHelmChart( this.props.name, {
            namespace: this.props.namespace,
            chart: this.props.chart,
            release: this.props.release,
            values: values
        });
    }
}