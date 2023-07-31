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
   * If provided, the addon will bootstrap the app or apps in the provided repository.
   * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
   * after the infrastructure and team provisioning is complete.
   * When GitOps mode is enabled via `ArgoGitOpsFactory` for deploying the AddOns, this bootstrap
   * repository will be used for provisioning all `HelmAddOn` based AddOns.
   */
  bootstrapRepo?: spi.ApplicationRepository;

  /**
   * Optional values for the bootstrap application. These may contain values such as domain named provisioned by other add-ons, certificate, and other parameters to pass 
   * to the applications. 
   */
  bootstrapValues?: spi.Values,

  /**
   * Values to pass to the chart as per https://github.com/argoproj/argo-helm/blob/master/charts/argo-cd/values.yaml.
   */
  values?: spi.Values;
  /**
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;

  /** 
  * Flux SecretRef */
  fluxSecretRefName?: string;

  /** 
  * Internal for Flux sync.
  * Default `5m0s` */
  fluxSyncInterval?: string;

  /** 
  * Flux Kustomization Target Namespace.
  * Default `default` */
  fluxTargetNamespace?: string;

  /** 
  * Flux Kustomization paths within the repository;
  * Flux Kustomizations will be created for bootstrapRepo.path and for the paths specified in this array */
  additionalFluxKustomizationPaths?: string[];

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
  fluxSyncInterval: "5m0s",
  fluxTargetNamespace: "default",
  fluxPrune: true,
  fluxTimeout: "1m"
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

    //Lets create a GitRepository resource as a source to Flux
    if (this.options.bootstrapRepo?.repoUrl) {
      const gitRepositoryConstruct = createGitRepository(clusterInfo, this.options);
      gitRepositoryConstruct.node.addDependency(chart);

      const kustomizationConstructs = createKustomizations(clusterInfo, this.options);
      kustomizationConstructs.map(kustomizationConstruct => kustomizationConstruct.node.addDependency(gitRepositoryConstruct));
    }
    return Promise.resolve(chart);
  }
}

/**
 * create GitRepository calls the FluxGitRepository().generate to create GitRepostory resource.
 */
function createGitRepository(clusterInfo: ClusterInfo, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest {
  if (fluxcdAddonProps.bootstrapRepo === undefined) {
    throw new Error("Missing Git repository");
  }
  
  const manifest = new FluxGitRepository(fluxcdAddonProps.bootstrapRepo).generate(fluxcdAddonProps.namespace!, fluxcdAddonProps.fluxSyncInterval!, fluxcdAddonProps.fluxSecretRefName!);
  let manifestName: string | undefined = fluxcdAddonProps.name + 'gitrepository';
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}

/**
 * create Kustomizations calls the FluxKustomization().generate multiple times to create Kustomization resources.
 */
function createKustomizations(clusterInfo: ClusterInfo, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest[] {
  let fluxKustomizationPaths = fluxcdAddonProps.bootstrapRepo?.path ? [fluxcdAddonProps.bootstrapRepo?.path] : ["."];

  if (fluxcdAddonProps.additionalFluxKustomizationPaths){
    fluxKustomizationPaths = fluxKustomizationPaths.concat(fluxcdAddonProps.additionalFluxKustomizationPaths as string[]);
  }

  const constructs: KubernetesManifest[] = [];
  const fluxKustomization = new FluxKustomization(fluxcdAddonProps.bootstrapRepo!);
  fluxKustomizationPaths.map((fluxKustomizationPath, index) => {
    const manifest =fluxKustomization.generate(
      fluxcdAddonProps.bootstrapRepo!.name! + "-" + index,
      fluxcdAddonProps.namespace!,
      fluxcdAddonProps.fluxSyncInterval!,
      fluxcdAddonProps.fluxTargetNamespace!,
      fluxcdAddonProps.fluxPrune!,
      fluxcdAddonProps.fluxTimeout!,
      fluxcdAddonProps.bootstrapValues!,
      fluxKustomizationPath);
    let manifestName: string | undefined = fluxcdAddonProps.name + 'kustomization' + index;
    constructs.push(clusterInfo.cluster.addManifest(manifestName!, manifest));
  });

  return constructs;
}
