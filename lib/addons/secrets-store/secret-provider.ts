import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ClusterInfo } from "../../../lib";
import { ApplicationTeam } from "../../teams";

/**
 * Secret Provider Interface
 * You can provide() your own Secrets driver OR
 * use the one we provide using AWS Secrets Manager and Config Provider(ASCP)
 */
export interface SecretsProvider {
  provide(clusterInfo: ClusterInfo): KubernetesManifest;
}

/**
 * Secrets to be provided
 */
export interface SecretsInfo {
  secrets: any;
  setupSecrets?(clusterInfo: ClusterInfo, team: ApplicationTeam): any;
}