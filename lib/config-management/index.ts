import { ClusterInfo } from "..";


export interface GitOpsAddOnProps {
    repoUrl: string,
    chart: string, 
    release: string,
    namespace: string
}

type Values = {
    [key: string]: any;
};

/**
 * Decorator function.
 * @returns intercept function
 */
export function enableGitops() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const dependencies = Array<Promise<Construct>>();
            const clusterInfo: ClusterInfo = args[0];
            const stack = clusterInfo.cluster.stack.stackName;

            addOns.forEach((addOn) => {
                const dep = clusterInfo.getScheduledAddOn(addOn);
                console.assert(dep, `Missing a dependency for ${addOn} for ${stack}`);
                dependencies.push(dep!);
            });

            const result: Promise<Construct> = originalMethod.apply(this, args);

            Promise.all(dependencies.values()).then((constructs) => {
                constructs.forEach((construct) => {
                    result.then((resource) => {
                        resource.node.addDependency(construct);
                    });
                });
            }).catch(err => { throw new Error(err) });

            return result;
        };

        return descriptor;
    };
}

export interface GitOpsApplicationGenerator {

    generate()

}

export class GitOpsFactory {

}