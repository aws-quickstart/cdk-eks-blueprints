import { Construct } from "@aws-cdk/core";
import { ClusterInfo } from ".";

export interface GitOpsAddOnProps {
    repoUrl: string,
    chart: string, 
    release: string,
    namespace: string
}

export type Values = {
    [key: string]: any;
};


export interface GitOpsAddOnDeploymentProps {
    addOnProps: GitOpsAddOnProps,
    values: Values
}

export interface GitOpsDeploymentGenerator {
    generate(clusterInfo: ClusterInfo, deployment: GitOpsAddOnDeploymentProps): Construct;
}