// lib/fluxcd_addon.ts
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
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
   * To Create Namespace using CDK
   */    
  createNamespace?: boolean;

  /* Optional Additional Flux Bootstrap Values 
  */
  fluxBootstrapValues: FluxBootstrapValues;
}

/* Interface for mapping for Flux Bootstrap Variables for Kustomization and FluxGitRepository
*/

export interface FluxBootstrapValues {

  /**
   * Expected to support helm style repo at the moment
   */
  repoUrl?: string,

  /**
   * Path within the repository
   */
  path?: string,

  /**
   * Optional name for the bootstrap application
   */
  name?: string,

  /**
   * Optional target revision for the repository.
   * TargetRevision defines the revision of the source
   * to sync the application to. In case of Git, this can be
   * commit, tag, or branch. If omitted, will equal to HEAD.
   */
  targetRevision?: string

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

  /** 
  * Flux Substitution variables.
  * Default `cluster_env: prod` */

  fluxSubstitutionVariables?: FluxSubstitutionVariable[];
}

/**
 * Interface for Mapping for Substitution Variables for Kustomization.
 */
export interface FluxSubstitutionVariable {
  key: string,
  value: string,
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
  fluxBootstrapValues: {
    fluxSyncInterval: "5m0s",
    fluxTargetNamespace: "default",
    fluxPrune: true,
    fluxTimeout: "1m"
  }
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
    if (this.options.fluxBootstrapValues.repoUrl) {
      const gitRepositoryConstruct = createGitRepository(clusterInfo, this.options);
      gitRepositoryConstruct.node.addDependency(chart);
      const kustomizationConstruct = createKustomization(clusterInfo, this.options);
      kustomizationConstruct.node.addDependency(gitRepositoryConstruct);
    }
    return Promise.resolve(chart);
  }
}

/**
 * create GitRepository calls the FluxGitRepository().generate to create GitRepostory resource.
 */
function createGitRepository(clusterInfo: ClusterInfo, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest {
  const manifest = new FluxGitRepository().generate(fluxcdAddonProps.namespace!, fluxcdAddonProps.fluxBootstrapValues!);
  let manifestName: string | undefined = fluxcdAddonProps.name + 'gitrepository';
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}

/**
 * create Kustomization calls the FluxKustomization().generate to create Kustomization resource.
 */
function createKustomization(clusterInfo: ClusterInfo, fluxcdAddonProps: FluxCDAddOnProps): KubernetesManifest {
  const manifest = new FluxKustomization().generate(fluxcdAddonProps.namespace!, fluxcdAddonProps.fluxBootstrapValues!);
  let manifestName: string | undefined = fluxcdAddonProps.name + 'kustomization';
  const construct = clusterInfo.cluster.addManifest(manifestName!, manifest);
  return construct;
}