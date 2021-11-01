import { Construct } from "@aws-cdk/core";
import { ClusterAddOn } from "../..";
import { enableGitOps, GitOpsAddOnProps, Values } from "../../config-management";
import { ClusterInfo } from "../../spi";


export abstract class HelmAddOn implements ClusterAddOn {

    constructor(readonly props: GitOpsAddOnProps, readonly id: string) {}
    
    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const namespace = this.getNamespace();
        const values = this.getValues();
        const manifest = this.addHelmChart(clusterInfo, values);
    }

    protected abstract getNamespace() : { name: string, node: Construct | undefined };

    protected abstract getValues(namespaceNode ?: Construct) : Values;


    @enableGitOps()
    protected addHelmChart(clusterInfo: ClusterInfo, values?: Values ) : Construct {
        return clusterInfo.cluster.addHelmChart( this.id, {
            namespace: this.props.namespace,
            chart: this.props.chart,
            release: this.props.release,
            values: values
        });
    }

}