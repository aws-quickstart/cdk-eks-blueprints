import { Construct } from "constructs";
import {ClusterInfo, Values} from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { EfsDriverPolicyDocument } from "./iam-policy";
import { registries }  from "../../utils/registry-utils";
import * as iam from "aws-cdk-lib/aws-iam";
import {setPath} from "../../utils";


const EFS_CSI_DRIVER = "aws-efs-csi-driver";
const EFS_CSI_CONTROLLER_SA = "efs-csi-controller-sa";
const EFS_REGISTRY_SUFFIX = "eks/aws-efs-csi-driver";

/**
 * Configuration options for the add-on.
 */
export interface EfsCsiDriverProps extends HelmAddOnUserProps {
    /**
     * Version of the driver to deploy. Uses chart version 2.2.3 by default if this value is not provided
     */
    version?: string,
    /***
     * Number of replicas to be deployed. If not provided, it defaults to 2. Note that the number of replicas
     * should be less than or equal to the number of nodes in the cluster otherwise some
     * pods will be left of pending state
     */
    replicaCount?: number

}

/**
 * Defaults options for the add-on
 */
const defaultProps: EfsCsiDriverProps = {
    version: '2.3.4',
    namespace: "kube-system",
    repository: "https://kubernetes-sigs.github.io/aws-efs-csi-driver/",
    name: EFS_CSI_DRIVER,
    chart: EFS_CSI_DRIVER,
    replicaCount: 2
};

export class EfsCsiDriverAddOn extends HelmAddOn {

    readonly options: EfsCsiDriverProps;

    constructor(props?: EfsCsiDriverProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props as EfsCsiDriverProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        // Create service account and policy
        const cluster = clusterInfo.cluster;
        const serviceAccount = cluster.addServiceAccount(EFS_CSI_CONTROLLER_SA, {
            name: EFS_CSI_CONTROLLER_SA,
            namespace: this.options.namespace,
        });
        EfsDriverPolicyDocument().Statement.forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });


        // Lookup appropriate image repo
        const repo = registries.get(clusterInfo.cluster.stack.region) + EFS_REGISTRY_SUFFIX;
        // setup value for helm chart
        const chartValues = populateValues(this.options, cluster.clusterName, serviceAccount.serviceAccountName, repo);

        // Define chart
        const efsCsiDriverChart = this.addHelmChart(clusterInfo, chartValues);

        efsCsiDriverChart.node.addDependency(serviceAccount);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(efsCsiDriverChart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 * @param clusterName Name of the cluster where to deploy the add-on
 * @param serviceAccountName Name of the service account used by the add-on
 * @param repository Repository to pull image for Add_on
 */
function populateValues(helmOptions: EfsCsiDriverProps, clusterName: string,
                        serviceAccountName: string, repository: string): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "clusterName",  clusterName);
    setPath(values, "controller.serviceAccount.create",  false);
    setPath(values, "controller.serviceAccount.name",  serviceAccountName);
    setPath(values, "replicaCount",  helmOptions.replicaCount);
    setPath(values, "image.repository",  repository);

    return values;
}