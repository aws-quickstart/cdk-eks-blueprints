import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Construct } from 'constructs';
import { ClusterInfo } from "../../spi";
import { createNamespace, dependable, loadYaml, readYamlDocument, supportsALL } from "../../utils";
import { CertManagerAddOn } from "../cert-manager";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { getAdotCollectorPolicyDocument } from "./iam-policy";

/**
 * Configuration options for the Adot add-on.
 */
export type AdotCollectorAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName" > & {
    namespace: string; 
  };

const defaultProps = {
    addOnName: 'adot',
    version: 'v0.80.0-eksbuild.2',
    saName: 'adot-collector',
    policyDocumentProvider: getAdotCollectorPolicyDocument,
    namespace: 'default'
};

 /**
  * Implementation of Adot Collector EKS add-on.
  */
@supportsALL
export class AdotCollectorAddOn extends CoreAddOn {

    private namespace: string;

    constructor(props?: AdotCollectorAddOnProps) {
        super({ 
            ...defaultProps,
            namespace: props?.namespace ?? defaultProps.namespace, 
            ...props
        });

        this.namespace = props?.namespace ?? defaultProps.namespace;
    }
    @dependable(CertManagerAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct>  {

        const cluster = clusterInfo.cluster;

        // Create namespace if not default
        const ns = createNamespace(this.namespace!, cluster, true, true);

        // Applying ADOT Permission manifest
        const otelPermissionsDoc = readYamlDocument(__dirname + '/otel-permissions.yaml');
        const otelPermissionsManifest = otelPermissionsDoc.split("---").map(e => loadYaml(e));
        const otelPermissionsStatement = new KubernetesManifest(cluster.stack, "adot-addon-otelPermissions", {
            cluster,
            manifest: otelPermissionsManifest,
            overwrite: true,
            
        });
        
        otelPermissionsStatement.node.addDependency(ns); 
        
        const addOnPromise = super.deploy(clusterInfo);
        addOnPromise.then(addOn => addOn.node.addDependency(otelPermissionsStatement));
        return addOnPromise;
    }
}
