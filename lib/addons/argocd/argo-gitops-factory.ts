import { Construct } from "constructs";
import { ArgoCDAddOn } from "../../addons";
import { HelmChartDeployment } from "../helm-addon/kubectl-provider";
import { ClusterInfo, GitOpsMode } from "../../spi";
import { KubectlProvider } from '../helm-addon/kubectl-provider';
import { kebabToCamel } from "../../utils";

const originalHelmDeploy = KubectlProvider.applyHelmDeployment;

export class ArgoGitOpsFactory {
    public static enableGitOps() {
        KubectlProvider.applyHelmDeployment = createArgoHelmApplication;
    }

    public static enableGitOpsAppOfApps() {
        KubectlProvider.applyHelmDeployment = generateArgoHelmApplicationValues;
    }
}

export const createArgoHelmApplication = function (clusterInfo: ClusterInfo, helmDeployment: HelmChartDeployment): Construct {
    if (clusterInfo.getResourceContext().blueprintProps.enableGitOpsMode == GitOpsMode.APPLICATION) {
        const argoAddOn = getArgoApplicationGenerator(clusterInfo);
        const values = helmDeployment.dependencyMode ? { [helmDeployment.chart]: helmDeployment.values } : helmDeployment.values;
        return argoAddOn.generate(clusterInfo, {
            name: helmDeployment.name,
            namespace: helmDeployment.namespace,
            values: values,
        });
    } else {
        return originalHelmDeploy(clusterInfo, helmDeployment);
    }
};

function getArgoApplicationGenerator(clusterInfo: ClusterInfo): ArgoCDAddOn {
    for (let addOn of clusterInfo.getResourceContext().blueprintProps.addOns ?? []) {
        const generator: any = addOn;
        if (generator instanceof ArgoCDAddOn) {
            return generator;
        }
    }
    throw Error("GitOps Engine is not defined in the blueprint");
}

export const generateArgoHelmApplicationValues = function (clusterInfo: ClusterInfo, helmDeployment: HelmChartDeployment): Construct {
    if (clusterInfo.getResourceContext().blueprintProps.enableGitOpsMode == GitOpsMode.APP_OF_APPS) {
        // Add `enabled` property to each addon
        helmDeployment.values.enable = true;
        clusterInfo.addAddOnContext(
            kebabToCamel(helmDeployment.name),
            helmDeployment.values,
        );
        // No dependencies required because the values are used at postDeploy stage of ArgoCD AddOn.
        // Generate dummy construct to meet the function requirement.
        return new Construct(clusterInfo.cluster, `dummy${helmDeployment.name}`);
    } else {
        return originalHelmDeploy(clusterInfo, helmDeployment);
    }
};
