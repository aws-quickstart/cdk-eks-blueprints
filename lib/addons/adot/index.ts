import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { ClusterInfo } from "../../spi";
import { getAdotCollectorPolicyDocument } from "./iam-policy";
import { loadYaml, readYamlDocument } from "../../utils";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Construct } from 'constructs';

/**
 * Configuration options for the Adot add-on.
 */
 export interface AdotCollectorAddOnProps extends CoreAddOnProps {
 }

const defaultProps = {
    addOnName: 'adot',
    saName: 'adot-collector',
    policyDocumentProvider: getAdotCollectorPolicyDocument,
    namespace: 'default'
};

 /**
  * Implementation of Adot Collector EKS add-on.
  */
 export class AdotCollectorAddOn extends CoreAddOn {

    constructor(props?: AdotCollectorAddOnProps) {
        super({ ...defaultProps, ...props });
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct>  {

        const cluster = clusterInfo.cluster;
        // Applying ADOT Permission manifest
        const otelPermissionsDoc = readYamlDocument(__dirname + '/otel-permissions.yaml');
        const otelPermissionsManifest = otelPermissionsDoc.split("---").map(e => loadYaml(e));
        const otelpermissionsstatement = new KubernetesManifest(cluster.stack, "adot-addon-otelPermissions", {
            cluster,
            manifest: otelPermissionsManifest,
            overwrite: true
        });

        const addOnPromise = super.deploy(clusterInfo);
        addOnPromise.then(AdotCollectorAddOn => AdotCollectorAddOn.node.addDependency(otelpermissionsstatement));
        return addOnPromise;
    }
 }












