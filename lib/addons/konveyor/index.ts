import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Construct } from 'constructs';
import { readYamlDocument, loadYaml, dependable } from "../../utils";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { KubernetesObjectValue } from "aws-cdk-lib/aws-eks";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";

export interface KonveyorAddOnProps {
    /**
     * Namespace for Konveyor/Tackle.
     * @default 'konveyor-operator'
     */
    namespace?: string;
    /**
     * Konveyor/Tackle name.
     * @default 'tackle'
     */
    konveyorName?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    * @default '100Gi'
    */
    cacheDataVolumeSize?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    *  @default '100Gi'
    */
    hubBucketVolumeSize?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    *  @default 'false'
    */
    rwxSupported?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    *  @default 'false'
    */
    featureAuthRequired?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    *  @default 'true'
    */
    featureIsolateNamespace?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    *  @default '5Gi'
    */
    hubDatabaseVolumeSize?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    * @default '1Gi'
    */
    keycloakDatabaseDataVolumeSize?: string;
    /**
    * See https://github.com/konveyor/tackle2-operator
    * @default '100Gi'
    */
    pathfinderDatabaseDataVolumeSize?: string;
    /**
     * Ingress name
     * @default 'http-ingress'
     */
    ingressName?: string;
    /**
     * Service name for the Ingress configuration
     * @default 'tackle-ui'
     */
    serviceName?: string;
    /**
     * Service port for the Ingress configuration
     * @default '8080'
     */
    servicePort?: number;
    /**
     * Certificate resource name for the Ingress HTTPS configuration
     */
    certificateResourceName: string;
    /**
     * Subdomain to be assigned to the Load Balancer
     */
    subdomain: string;
    /**
     * URL of the Konveyor Operator Manifest
     */
    konveyorOperatorManifestUrl?: string;
}

/**
 * Default Konveyor/Tackle properties
 */
const defaultProps = {
    namespace: "konveyor-operator",
    konveyorName: "tackle",
    cacheDataVolumeSize: "100Gi",
    hubBucketVolumeSize: "100Gi",
    rwxSupported: "false",
    featureAuthRequired: "false",
    featureIsolateNamespace: "true",
    hubDatabaseVolumeSize: "5Gi",
    keycloakDatabaseDataVolumeSize: "1Gi",
    pathfinderDatabaseDataVolumeSize: "100Gi",
    ingressName: "http-ingress",
    serviceName: "tackle-ui",
    servicePort: 8080,
    konveyorOperatorManifestUrl: "https://operatorhub.io/install/konveyor-0.1/konveyor-operator.yaml"
};

export class KonveyorAddOn implements ClusterAddOn {
    readonly props: KonveyorAddOnProps;

    constructor(props?: KonveyorAddOnProps) {
        this.props = { ...defaultProps, ...props } as KonveyorAddOnProps;
    }

    @dependable('AwsLoadBalancerControllerAddOn')
    @dependable("EbsCsiDriverAddOn")
    @dependable("OlmAddOn")
    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const kubectlProvider = new KubectlProvider(clusterInfo);

        // load Konveyor operator from URL
        /* eslint-disable */
        const request = require('sync-request');
        const response = request('GET', this.props.konveyorOperatorManifestUrl);
        const konveyorOperatorDoc: string = response.getBody().toString();
        const konveyorOperatorDocReplacedNamespace = konveyorOperatorDoc.replace(/my-konveyor-operator/g, this.props.namespace!);
        const konveyorOperatorManifest = konveyorOperatorDocReplacedNamespace.split("---").map(e => loadYaml(e));

        const konveyorOperatorDeployment: ManifestDeployment = {
            name: "konveyor-operator-deployment",
            namespace: this.props.namespace!,
            manifest: konveyorOperatorManifest,
            values: {}
        };

        const konveyorOperatorStatement = kubectlProvider.addManifest(konveyorOperatorDeployment);

        // wait for OLM to be deployed otherwise CRDs are not found
        const waitOLMDeployment = new KubernetesObjectValue(konveyorOperatorStatement, 'WaitOLMDeployment', {
            cluster: clusterInfo.cluster,
            objectType: "Service",
            objectName: "operatorhubio-catalog",
            objectNamespace:"olm",
            jsonPath: ".metadata.name"
        });

        konveyorOperatorStatement.node.addDependency(waitOLMDeployment);

        // load Tackle and Ingress resources
        const doc = readYamlDocument(__dirname + "/tackle-manifest.ytpl");
        const konveyorManifest = doc.split("---").map(e => loadYaml(e));
        
        const certificateArn = clusterInfo.getResource<ICertificate>(this.props.certificateResourceName)?.certificateArn;
        const subdomain = this.props.subdomain;
        const konveyorManifestDeployment: ManifestDeployment = {
            name: "konveyor-deployment",
            namespace: this.props.namespace!,
            manifest: konveyorManifest,
            values: { ...this.props, certificateArn, subdomain }
        };

        const konveyorStatement = kubectlProvider.addManifest(konveyorManifestDeployment);

        // wait for Konveyor to be deployed otherwise CRDs are not found
        const waitKonveyorOperatorDeployment = new KubernetesObjectValue(konveyorStatement, 'WaitKonveyorOperatorDeployment', {
          cluster: clusterInfo.cluster,
          objectType: "CustomResourceDefinition",
          objectName: "tackles.tackle.konveyor.io",
          jsonPath: ".spec.group"
        });

        konveyorStatement.node.addDependency(waitKonveyorOperatorDeployment);

        return Promise.resolve(konveyorStatement);
    }
}