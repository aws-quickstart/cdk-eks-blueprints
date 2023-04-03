import { ClusterInfo, ApplicationRepository, ClusterAddOn } from "../../spi";
import { loadExternalYamlWithIterator } from "../../utils";
import { Construct } from 'constructs';
import { createSecretObject } from './manifest-utils';
import { createNamespace, getSecretValue } from '../../utils';
import { Cluster } from 'aws-cdk-lib/aws-eks';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';

/**
 * Configuration options for the FluxCD add-on.
 */

export interface FluxCDRepository extends ApplicationRepository {

    /**
     * It specifies the interval at which the Git repository must be fetched.
     */
    gitRepoSpecInterval: string

    /**
     * Detect drift and undo kubectl edits baed on the specified value (e-g 60m0s) by setting the Kustomization.spec.interval in the Kustomization Object of the FluxCD
    */
    kustomizationSpecInterval: string

    /**
     * Set the namespace for all resources in the Kustomization.spec.targetNamespace for FluxCD
    */
    kustomizationTargetNamespace?: string

}
export interface FluxCDAddOnProps {
    /**
    * Namespace where add-on will be deployed. 
    * @default flux-system
    */
    namespace?: string;

    /*
    * Flux cd version to install
    */
    version: string;

    /**
     * If provided, the addon will bootstrap the app or apps in the provided repository.
     * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
     * after the infrastructure and team provisioning is complete. 
     */
    bootstrapRepo?: FluxCDRepository[];
}


/**
 * Implementation of FluxCD EKS add-on.
 */
export class FluxCDAddOn implements ClusterAddOn {

    readonly options: FluxCDAddOnProps;
    public installManifest: any;
        

    constructor(props?: FluxCDAddOnProps) {
        this.options = props as FluxCDAddOnProps ;
        this.options.namespace = 'flux-system' //FluxCD uses the flux-system namespace for all of its components.
    }

    /**
     * Implementation of the add-on contract deploy method.
    */
    deploy(clusterInfo: ClusterInfo) {

        const cluster = clusterInfo.cluster;
        

        const fluxResourceNodes: Construct[] = [];
        const fluxResourceManifests = loadExternalYamlWithIterator(`https://github.com/fluxcd/flux2/releases/download/${this.options.version}/install.yaml`);

        fluxResourceManifests.forEach((m: any, i: any) => {
            const manifestResource = cluster.addManifest(`flux-${i}`, m);
            if (fluxResourceNodes.length > 0) {
                manifestResource.node.addDependency(fluxResourceNodes[fluxResourceNodes.length - 1]);
            }
            fluxResourceNodes.push(manifestResource);
        });
        if (this.options.bootstrapRepo){
            this.options.bootstrapRepo.forEach((fluxRepo: FluxCDRepository, i: any) => {

                if (fluxRepo?.kustomizationTargetNamespace! != this.options.namespace){
                    createNamespace(fluxRepo?.kustomizationTargetNamespace!, clusterInfo.cluster, true);
                }
                
                getSecretValue(fluxRepo?.credentialsSecretName!, clusterInfo.cluster.stack.region).then((value) =>{
                    const str: string = value
                    this.addFluxAdditionalCompnentAsManifest(cluster,value,fluxResourceNodes, fluxRepo, i);
                })

            })
        }
    }

    protected addFluxAdditionalCompnentAsManifest(cluster: Cluster,secretValue: string, fluxResourceNodes: Construct[], fluxRepo: FluxCDRepository, i: any) {
        
        const secretManifest = new KubernetesManifest(cluster.stack, `GitRepoSecret-${i}`, {
            cluster,
            manifest: [createSecretObject(secretValue, fluxRepo)],
            overwrite: true
        });
        
        secretManifest.node.addDependency(fluxResourceNodes[fluxResourceNodes.length - 1]);

        const gitRepoManifest = cluster.addManifest(`GitRepoSelf-${i}`, {
            apiVersion: 'source.toolkit.fluxcd.io/v1beta1',
            kind: 'GitRepository',
            metadata: {
                name: `${fluxRepo.name}-repository`,
                namespace: this.options.namespace
            },
            spec: {
                interval: fluxRepo?.gitRepoSpecInterval,
                ref: {
                    branch: fluxRepo?.targetRevision, 
                },
                secretRef: {
                    name: fluxRepo?.credentialsSecretName,
                },
                url: fluxRepo?.repoUrl
            }
        });
        gitRepoManifest.node.addDependency(fluxResourceNodes[fluxResourceNodes.length - 1]);
        gitRepoManifest.node.addDependency(secretManifest);

        let kustomization = cluster.addManifest(`kustomization-${i}`, {
            apiVersion: 'kustomize.toolkit.fluxcd.io/v1beta2',
            kind: 'Kustomization',
            metadata: {
                name: `${fluxRepo.kustomizationTargetNamespace}-kustomization`,
                namespace: this.options.namespace,
            },
            spec: {
                interval: fluxRepo?.kustomizationSpecInterval,
                targetNamespace: fluxRepo?.kustomizationTargetNamespace,
                sourceRef: {
                    kind: 'GitRepository',
                    name: `${fluxRepo.name}-repository`,
                },
                path: fluxRepo?.path,
                prune: true
            }
        });
        kustomization.node.addDependency(gitRepoManifest);
    }

    /**
    * @returns secret value from secret manager.
    */
    protected async getSecretValue(region: string, fluxRepo: FluxCDRepository ): Promise<string> {
        const secretValue = await Promise.resolve(getSecretValue(fluxRepo?.credentialsSecretName!, region));
        return secretValue
    }
}


