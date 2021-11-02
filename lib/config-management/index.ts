import { Construct } from "@aws-cdk/core";
import { ClusterInfo, GitOpsDeploymentGenerator, Values } from "..";
import { HelmAddOn } from "../addons/helm-addon";




/**
 * Decorator function.
 * @returns intercept function
 */
export function enableGitOps() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
        const _originalMethod = descriptor.value;

        descriptor.value = function (clusterInfo: ClusterInfo, values: Values): Construct {
            const application = (<HelmAddOn>this).props;
            const generator = GitOpsFactory.getApplicationGenerator(clusterInfo);
            const result = generator.generate(clusterInfo, {
                application: {
                    name: application.name,
                    namespace: application.namespace
                },
                values
            });
            return result.manifest;
        };

        return descriptor;
    };
}



export class GitOpsFactory {

    public static gitOpsEngine: GitOpsDeploymentGenerator | undefined = undefined;

    public static getApplicationGenerator(clusterInfo: ClusterInfo) : GitOpsDeploymentGenerator {
        if(this.gitOpsEngine) {
            return this.gitOpsEngine;
        }
        for (let addOn of clusterInfo.getResourceContext().blueprintProps.addOns?? []) {
            const generator : any = addOn;
            if((generator as GitOpsDeploymentGenerator).generate != undefined) {
                return <GitOpsDeploymentGenerator>generator;
            }
        }
        throw Error("GitOps Engine is not defined in the blueprint");
    }
}


