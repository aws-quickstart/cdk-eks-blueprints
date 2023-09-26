import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Construct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { ArchType, arch, dependable, loadYaml, readYamlDocument } from "../../utils";
import { CertManagerAddOn } from "../cert-manager";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { getAdotCollectorPolicyDocument } from "./iam-policy";

/**
 * Configuration options for the Adot add-on.
 */
export type AdotCollectorAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName" >;

const defaultProps = {
    addOnName: 'adot',
    version: 'v0.78.0-eksbuild.1',
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
    @dependable(CertManagerAddOn.name)
    @arch(ArchType.X86,ArchType.ARM)
    deploy(clusterInfo: ClusterInfo): Promise<Construct>  {

        const cluster = clusterInfo.cluster;
        // Applying ADOT Permission manifest
        const otelPermissionsDoc = readYamlDocument(__dirname + '/otel-permissions.yaml');
        const otelPermissionsManifest = otelPermissionsDoc.split("---").map(e => loadYaml(e));
        const otelPermissionsStatement = new KubernetesManifest(cluster.stack, "adot-addon-otelPermissions", {
            cluster,
            manifest: otelPermissionsManifest,
            overwrite: true
        });

        const addOnPromise = super.deploy(clusterInfo);
        addOnPromise.then(addOn => addOn.node.addDependency(otelPermissionsStatement));
        return addOnPromise;
    }
}
