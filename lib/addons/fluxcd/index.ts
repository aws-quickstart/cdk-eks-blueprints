// lib/fluxcd_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { ClusterInfo, Values } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { FluxGitRepository } from "./gitrepository";
import { FluxKustomization } from "./kustomization";
import * as spi from "../../spi";
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks/lib/k8s-manifest';
/**
 * User provided options for the Helm Chart
 */
export interface FluxCDAddOnProps extends HelmAddOnUserProps {
  /**
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;

  /**
   * Optional values for `GitRepository` Source to produce an Artifact for a Git repository revision.
   */
  bootstrapRepo?: spi.ApplicationRepository;

  /** 
  * Internal for Flux sync.
  * Default `5m0s` */

  fluxSyncInterval?: string;

  /** 
  * Flux Kustomization Target Namespace.
  * Default `default` */

  fluxTargetNamespace?: string;

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
  version: "2.7.0",
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
    if (this.options.bootstrapRepo) {
      const gitRepositoryConstruct = createGitRepository(clusterInfo, this.options.bootstrapRepo, this.options);
      gitRepositoryConstruct.node.addDependency(chart);
      const kustomizationConstruct = createKustomization(clusterInfo, this.options.bootstrapRepo, this.options);
      kustomizationConstruct.node.addDependency(gitRepositoryConstruct);
    }
    return Promise.resolve(chart);
  }
}

/**
 * create GitRepository calls the FluxGitRepository().generate to create GitRepostory resource.
 */
function createGitRepository(clusterInfo: ClusterInfo, bootstrapRepo: spi.ApplicationRepository, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest {
  const manifest = new FluxGitRepository(bootstrapRepo).generate(fluxcdAddonProps.namespace!, fluxcdAddonProps.fluxSyncInterval!);
  let manifestName: string | undefined = fluxcdAddonProps.name;
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}

/**
 * create Kustomization calls the FluxKustomization().generate to create Kustomization resource.
 */
function createKustomization(clusterInfo: ClusterInfo, bootstrapRepo: spi.ApplicationRepository, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest {
  const manifest = new FluxKustomization(bootstrapRepo).generate(fluxcdAddonProps.namespace!, fluxcdAddonProps.fluxSyncInterval!, fluxcdAddonProps.fluxTargetNamespace!, fluxcdAddonProps.fluxPrune!, fluxcdAddonProps.fluxTimeout!);
  let manifestName: string | undefined = fluxcdAddonProps.name;
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}