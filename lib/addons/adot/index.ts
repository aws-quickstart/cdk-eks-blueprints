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
    version: 'v0.88.0-eksbuild.2',
    saName: 'adot-collector',
    policyDocumentProvider: getAdotCollectorPolicyDocument,
    namespace: 'default',
    configurationValues: {}
};

 /**
  * Implementation of Adot Collector EKS add-on.
  */
@supportsALL
export class AdotCollectorAddOn extends CoreAddOn {

    constructor(props?: AdotCollectorAddOnProps) {
        super({ 
            ...defaultProps,
            namespace: props?.namespace ?? defaultProps.namespace, 
            ...props
        });

    }
    @dependable(CertManagerAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct>  {

        const cluster = clusterInfo.cluster;

        if (validateAdotVersion(this.coreAddOnProps.version)) {
            console.log("Used Adot Addon Version is Valid");
        } 
        else {
            throw new Error(`Adot Addon Version is not Valid and greater than 0.88.0`);
        }

        // Create namespace if not default
        const ns = createNamespace(this.coreAddOnProps.namespace!, cluster, true, true);

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

function validateAdotVersion(adotversion: string): boolean {
    // Extract the substring from position 2 to 5
    const extractedSubstring = adotversion.substring(1, 4);
    const adotVersionRegex = new RegExp(`^0\.00`); // Use a regex to match the version format
  
    // Check if the input matches the regex
    if (!adotVersionRegex.test(adotversion)) {
      return false;
    }
  
    // Parse the input as a float and perform greater-than validation
    const adotVersionValue = parseFloat(adotversion);
    const adotVersionMinValue = 0.88; // Set your minimum value here
  
    return adotVersionValue >= adotVersionMinValue;
}
  

