// lib/fluxcd_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import * as spi from "../../spi";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { FluxGitRepository } from "./gitrepository";
import { FluxKustomization } from "./kustomization";
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks/lib/k8s-manifest';

/**
 * Options for a FluxCD repository
 */
export interface FluxCDGitRepo extends Omit<spi.GitOpsApplicationDeployment, "repository">{

    /** 
     * Repository to create source from
     */
    repository: Omit<spi.GitRepositoryReference, "path" | "name">
  /** 
  * Flux SecretRef */
  fluxSecretRefName?: string;

  /** 
  * Internal for Flux sync.
  * Default `5m0s` */
  fluxSyncInterval?: string;

    /**
     * List of kustomizations to create */
    kustomizations?: FluxKustomizationProps[];
}

export interface FluxKustomizationProps {
    /**
     * Flux Kustomization path within the GitRepository 
     * Do not use the path in the repository field*/
    fluxKustomizationPath: string;

    /** 
    * Flux Kustomization Target Namespace.
    * Note: when set, this parameter will override all the objects that are part of the Kustomization, please see https://fluxcd.io/flux/components/kustomize/kustomization/#target-namespace */
    kustomizationTargetNamespace?: string;

    /** 
    * Flux Kustomization Prune.
    * Default `true` */
    fluxPrune?: boolean;

    /** 
    * Flux Kustomization Timeout.
    * Default `1m` */
    fluxTimeout?: string;
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
  * @default 2.8.0
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
   * List of repositories to sync
   */
  repositories?: FluxCDGitRepo[];
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & FluxCDAddOnProps = {
  name: "fluxcd-addon",
  namespace: "flux-system",
  chart: "flux2",
  version: "2.9.0",
  release: "blueprints-fluxcd-addon",
  repository: "https://fluxcd-community.github.io/helm-charts",
  values: {},
  createNamespace: true,
};

const defaultRepoProps: Partial<FluxCDGitRepo> = {
    fluxSyncInterval: "5m0s",
};

const defaultKustomiationProps: FluxKustomizationProps = {
    fluxKustomizationPath: ".",
    fluxPrune: true,
    fluxTimeout: "1m",
};

/**
 * Main class to instantiate the Helm chart
 */
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

    return Promise.resolve(chart);
  }
}

/**
 * create GitRepository calls the FluxGitRepository().generate to create GitRepostory resource.
 */
function createGitRepository(clusterInfo: ClusterInfo, name: string, namespace: string, fluxcdGitRepo: FluxCDGitRepo): KubernetesManifest {
  if (fluxcdGitRepo.repository === undefined) {
    throw new Error("Missing Git repository");
  }
  
  const manifest = new FluxGitRepository(fluxcdGitRepo.repository).generate(fluxcdGitRepo.name, fluxcdGitRepo.namespace ?? namespace, fluxcdGitRepo.fluxSyncInterval!, fluxcdGitRepo.fluxSecretRefName!);
  let manifestName: string | undefined = name + 'gitrepository' + fluxcdGitRepo.name;
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}

/**
 * create Kustomizations calls the FluxKustomization().generate multiple times to create Kustomization resources.
 */
function createKustomizations(clusterInfo: ClusterInfo, name: string, namespace: string, fluxcdGitRepo: FluxCDGitRepo): KubernetesManifest[] {
  const constructs: KubernetesManifest[] = [];
  const kustomizations = fluxcdGitRepo.kustomizations ?? [{fluxKustomizationPath: "."}]
  const fluxKustomization = new FluxKustomization(fluxcdGitRepo.repository!);
  kustomizations?.map((kustomization, index) => {
    kustomization = {...defaultKustomiationProps, ...kustomization}
    const manifest =fluxKustomization.generate(
      fluxcdGitRepo.name + "-" + index,
      fluxcdGitRepo.namespace ?? namespace,
      fluxcdGitRepo.fluxSyncInterval!,
      kustomization.fluxPrune!,
      kustomization.fluxTimeout!,
      fluxcdGitRepo.values,
      kustomization.fluxKustomizationPath,
      kustomization.kustomizationTargetNamespace,
    );
    let manifestName: string | undefined = name + 'kustomization' +fluxcdGitRepo.name + index;
    constructs.push(clusterInfo.cluster.addManifest(manifestName!, manifest));
    
  });

  return constructs;
}
