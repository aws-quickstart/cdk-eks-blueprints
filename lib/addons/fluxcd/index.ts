// lib/fluxcd_addon.ts
import { Construct } from 'constructs';
import { merge } from "ts-deepmerge";
import * as spi from "../../spi";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace, supportsALL } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { FluxGitRepository } from "./gitrepository";
import { FluxKustomization } from "./kustomization";
import { FluxBucket } from './bucket';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks/lib/k8s-manifest';

/**
 * Options for a FluxCD GitRepository
 * path and name parameter within repository parameter do not have any affect in flux, may have an affect in argo
 */
export interface FluxGitRepo extends Required<spi.GitOpsApplicationDeployment> {
    /** 
     * Flux SecretRef
     */
    secretRefName?: string;

    /** 
     * Internal for Flux sync.
     * Default `5m0s`
     */
    syncInterval?: string;

    /**
     * List of kustomizations to create from different paths in repo
     */
    kustomizations?: FluxKustomizationProps[];
}

/**
 * Options for a FluxCD Bucket.
 */
export interface FluxBucketRepo {
    /**
     * Name of the FluxCD bucket resource.
     */
    name: string;

    /**
     * Namespace for the FluxCD bucket source (optional)
     * Default is `default`
     */
    namespace?: string;
    
    /**
     * Flux Kustomization variable substitutions (optional)
     * {@link https://fluxcd.io/flux/components/kustomize/kustomizations/#post-build-variable-substitution}
     */
    values?: Values;

    /**
     * Source S3 Bucket name
     */
    bucketName: string;

    /**
     * Prefix path used for server-side filtering (optional)
     */
    prefixPath?: string;

    /**
     * Source S3 Bucket region
     */
    bucketRegion: string;

    /** 
     * References to a Secret containing `accesskey` and `secretkey` fields to authenticate as an IAM user (optional) 
     * Default to authentication using the IAM instance profile
     */
    secretRefName?: string;

    /** 
     * Syncronization time interval for Flux sync
     * Default `5m0s`
     */
    syncInterval?: string;

    /**
     * Override S3 Bucket endpoint (optional)
     * Default `s3.amazonaws.com`
     */
    endpoint?: string;

    /**
     * Override S3 Bucket provider (optional)
     * Default `aws`
     */
    provider?: string;

    /**
     * List of kustomizations to create from different paths in repo (optional)
     */
    kustomizations?: FluxKustomizationProps[];
}

export interface FluxKustomizationProps {
    /**
     * Flux Kustomization path within the GitRepository 
     * Do not use the path in the repository field
     */
    kustomizationPath: string;

    /** 
    * Flux Kustomization Target Namespace.
    * Note: when set, this parameter will override all the objects that are part of the Kustomization, please see https://fluxcd.io/flux/components/kustomize/kustomization/#target-namespace
    */
    kustomizationTargetNamespace?: string;

    /** 
    * Internal for Flux sync.
    * Default `5m0s`
    */
    syncInterval?: string;

    /** 
    * Flux Kustomization Prune.
    * Default `true`
    */
    prune?: boolean;

    /** 
    * Flux Kustomization Timeout.
    * Default `1m`
    */
    timeout?: string;
}

/**
 * User provided options for the Helm Chart
 */
export interface FluxCDAddOnProps extends HelmAddOnUserProps {

    /**
     * Namespace where add-on will be deployed. 
     * @default flux-system
     */
    namespace?: string;

    /**
     * Helm chart version to use to install.
     * @default 2.13.0
     */
    version?: string;

    /**
     * Values to pass to the chart as per https://github.com/argoproj/argo-helm/blob/master/charts/argo-cd/values.yaml.
     */
    values?: spi.Values;

    /**
     * To Create Namespace using CDK
     */    
    createNamespace?: boolean;

    /**
     * List of repositories to sync from.
     */
    repositories?: FluxGitRepo[];

    /**
     * List of buckets to sync from.
     */
    buckets?: FluxBucketRepo[];
}

/**
 * Default props to be used when creating the Helm chart.
 * Find the latest version using the GitHub CLI command:
 * `$ gh release  list --repo fluxcd-community/helm-charts`
 * or from the packages page:
 * @link https://github.com/fluxcd-community/helm-charts/pkgs/container/charts%2Fflux2
 */
const defaultProps: HelmAddOnProps & FluxCDAddOnProps = {
    name: "fluxcd-addon",
    namespace: "flux-system",
    chart: "flux2",
    version: "2.13.0",
    release: "blueprints-fluxcd-addon",
    repository: "oci://ghcr.io/fluxcd-community/charts/flux2",
    values: {},
    createNamespace: true,
};

const defaultRepoProps: Partial<FluxGitRepo> = {
    syncInterval: "5m0s",
};

const defaultBucketProps: Partial<FluxBucketRepo> = {
    namespace: "flux-system",
    syncInterval: "5m0s",
    endpoint: "s3.amazonaws.com",
    provider: "aws",
};

const defaultKustomizationProps: FluxKustomizationProps = {
    kustomizationPath: ".",
    syncInterval: "5m0s",
    prune: true,
    timeout: "1m",
};

/**
 * Main class to instantiate the Helm chart
 */
@supportsALL
export class FluxCDAddOn extends HelmAddOn {

    readonly options: FluxCDAddOnProps;

    constructor(props?: FluxCDAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as FluxCDAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values: Values = this.options.values ?? {};
        values = merge(values, this.props.values ?? {});
        const chart = this.addHelmChart(clusterInfo, values);

        if( this.options.createNamespace == true){
            // Let CDK Create the Namespace
            const namespace = createNamespace(this.options.namespace! , cluster);
            chart.node.addDependency(namespace);
        }

        //Create GitRepository sources and Kustomizations
        if (this.options.repositories) {
            this.options.repositories.map((repo) => {
                repo = {...defaultRepoProps, ...repo};
                const gitRepositoryConstruct = createGitRepository(clusterInfo, this.options.name!, this.options.namespace!, repo);
                gitRepositoryConstruct.node.addDependency(chart);

                const kustomizationConstructs = createKustomizations(clusterInfo, this.options.name!, this.options.namespace!, repo);
                kustomizationConstructs.map(kustomizationConstruct => kustomizationConstruct.node.addDependency(gitRepositoryConstruct));
            });
        }

        // Create Bucket sources and Kustomizations
        if (this.options.buckets) {
            this.options.buckets.map((bucket) => {
                bucket = {...defaultBucketProps, ...bucket};
                const bucketConstruct = createBucket(clusterInfo, this.options.name!, this.options.namespace!, bucket);
                bucketConstruct.node.addDependency(chart);

                const kustomizationConstructs = createKustomizations(clusterInfo, this.options.name!, this.options.namespace!, bucket, "Bucket");
                kustomizationConstructs.map(kustomizationConstruct => kustomizationConstruct.node.addDependency(bucketConstruct));
            });
        }

        return Promise.resolve(chart);
    }
}

/**
 * create GitRepository calls the FluxGitRepository().generate to create GitRepostory resource.
 */
function createGitRepository(clusterInfo: ClusterInfo, name: string, namespace: string, fluxGitRepo: FluxGitRepo): KubernetesManifest {
    if (fluxGitRepo.repository === undefined) {
        throw new Error("Missing Git repository");
    }

    const manifest = new FluxGitRepository(fluxGitRepo.repository).generate(
        fluxGitRepo.name,
        fluxGitRepo.namespace ?? namespace,
        fluxGitRepo.syncInterval!,
        fluxGitRepo.secretRefName!);
    let manifestName: string | undefined = name + 'gitrepository' + fluxGitRepo.name;
    const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
    return construct;
}

/**
 * create Bucket calls the FluxBucket().generate to create Bucket resource.
 */
function createBucket(clusterInfo: ClusterInfo, name: string, namespace: string, props: FluxBucketRepo): KubernetesManifest {
    const manifest = new FluxBucket(props.bucketName, props.bucketRegion, props.prefixPath).generate(
        props.name,
        props.namespace ?? namespace,
        props.syncInterval!,
        props.provider!,
        props.endpoint!,
        props.secretRefName!);
    let manifestName: string | undefined = name + 'bucketrepository' + props.name;
    return clusterInfo.cluster.addManifest(manifestName!, manifest);
}

/**
 * create Kustomizations calls the FluxKustomization().generate multiple times to create Kustomization resources.
 */
function createKustomizations(clusterInfo: ClusterInfo, name: string, namespace: string, fluxSource: FluxGitRepo | FluxBucketRepo, fluxSourceKind?: string): KubernetesManifest[] {
    const constructs: KubernetesManifest[] = [];
    const kustomizations = fluxSource.kustomizations ?? [{kustomizationPath: "."}];
    const fluxKustomization = new FluxKustomization();
    kustomizations?.map((kustomization, index) => {
        kustomization = {...defaultKustomizationProps, ...kustomization};
        const manifest = fluxKustomization.generate(
            fluxSource.name + "-" + index,
            fluxSource.name,
            fluxSource.namespace ?? namespace,
            kustomization.syncInterval!,
            kustomization.prune!,
            kustomization.timeout!,
            fluxSource.values || {},
            kustomization.kustomizationPath,
            kustomization.kustomizationTargetNamespace,
            fluxSourceKind,
        );
        let manifestName: string | undefined = name + 'kustomization' + fluxSource.name + index;
        constructs.push(clusterInfo.cluster.addManifest(manifestName!, manifest));
    });

    return constructs;
}
