import { Construct } from "@aws-cdk/core";
import { ClusterInfo, GitOpsApplicationDeployment, GitOpsDeploymentGenerator, Values } from "..";
import { HelmAddOn } from "../addons/helm-addon";




/**
 * Decorator function.
 * @returns intercept function
 */
export function enableGitOps() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (clusterInfo: ClusterInfo, values: Values) {
            const repo = (<HelmAddOn>target).props;
            clusterInfo.addGitOpsDeployment({
                application: repo,
                values: values
            });
        };

        return descriptor;
    };
}



export class GitOpsFactory {
    public static getApplicationGenerator() : GitOpsDeploymentGenerator {
        return new ArgoGitOpsGenerator();
    }
}

export class ArgoGitOpsGenerator implements GitOpsDeploymentGenerator {
    generate(clusterInfo: ClusterInfo, deployment: GitOpsApplicationDeployment): Construct {
        throw new Error("Method not implemented.");
    }
}
