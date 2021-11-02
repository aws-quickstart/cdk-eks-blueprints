import { Construct } from "@aws-cdk/core";
import * as spi from "../..";
import { enableGitOps } from "../../config-management";


export abstract class HelmAddOn implements spi.ClusterAddOn {

    constructor(readonly props: spi.GitOpsApplication, readonly id: string) {}
    
    deploy(clusterInfo: spi.ClusterInfo): void | Promise<Construct> {
        const namespace = this.getNamespace();
        const values = this.getValues();
        const manifest = this.addHelmChart(clusterInfo, values);
        if(namespace.node) {
            manifest.node.addDependency(namespace.node);
        }
    }

    protected abstract getNamespace() : { name: string, node: Construct | undefined };

    protected abstract getValues(namespaceNode ?: Construct) : spi.Values;

    @enableGitOps()
    protected addHelmChart(clusterInfo: spi.ClusterInfo, values?: spi.Values ) : Construct {
        return clusterInfo.cluster.addHelmChart( this.id, {
            namespace: this.props.namespace,
            chart: this.props.repository.name!,
            release: this.props.repository.targetRevision,
            values: values
        });
    }
}