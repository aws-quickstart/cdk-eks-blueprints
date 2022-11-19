import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import {loadExternalYaml} from "../../utils";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * 
 */
export interface KnativeOperatorProps {
    /**
     * The namespace to install Knative in
     * @default default
     */
    namespace?: string;

    /**
     * The name to be assigned to given to the Knative operator
     * @default knative-operator
     */
    name?: string;

    /**
     * The version of the KNative Operator to use
     * @default v1.8.1
     */
    version?: string;

    /**
     * 
     * @default 'https://github.com/knative/operator/releases/download/knative'
     */
    base_url?: string;
}

const defaultProps = {
    name: 'knative-operator',
    namespace: 'default',
    version: 'v1.8.1',
    base_url: `https://github.com/knative/operator/releases/download/knative`
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeOperator implements ClusterAddOn {

    readonly knativeAddOnProps: KnativeOperatorProps;

    constructor(props?: KnativeOperatorProps) {
        this.knativeAddOnProps = { ...defaultProps, ...props };
    }

    // TODO: Find out why @dependable isn't working
    // @dependable('IstioControlPlaneAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        // Load External YAML: https://github.com/knative/operator/releases/download/knative-v1.8.1/operator.yaml
        const doc = loadExternalYaml(this.knativeAddOnProps.base_url + `-${this.knativeAddOnProps.version}/operator.yaml`);
        // console.log(doc);
        // const manifest = doc.split("---")
        // const values: Values = {
        //     namespace: this.knativeAddOnProps.namespace,
        //     name: this.knativeAddOnProps.name,
        //     version: this.knativeAddOnProps.version
        // };
        // const knativeStatement: ManifestDeployment = {
        //     name: this.knativeAddOnProps.name!,
        //     namespace: this.knativeAddOnProps.namespace!,
        //     manifest: doc,
        //     values: values
        // };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        // TODO: This statement errors out because addManifest doesn't actually like multi-manifest files
        /*
            this is also possibly an upstream issue where aws-cdk-lib/aws-eks/lib/k8s-manifest.js:36:79
            does not accept an array of K8s Manifests. It uses for (const res OF manifest) instead of IN manifest
            Will try to resolve by adding each manifest separately
        */
        const all_but_last = doc.slice(0, -1);
        all_but_last.forEach((e: ManifestDeployment) => kubectlProvider.addManifest(e));  // Hacky way of adding each manifest manually until the last one
        const statement = kubectlProvider.addManifest(doc.slice(-1)[0]);         // Then resolve on the last statement signifying, we're done adding
        return Promise.resolve(statement);
    }
}
