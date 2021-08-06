import { Construct } from "@aws-cdk/core";
import { ClusterInfo } from "../../../lib";
import { ApplicationTeam } from "../../teams";

/**
 * Secret Provider Interface
 * You can provide() your own Secrets driver OR
 * use the one we provide using AWS Secrets Manager and Config Provider(ASCP)
 */
export interface SecretsProvider {
  provide(clusterInfo: ClusterInfo): Construct;
}

/**
 * Secrets to be provided
 */
export interface SecretsInfo {
  secrets: any;
  setupSecrets?(clusterInfo: ClusterInfo, team: ApplicationTeam, secretsManifest: Construct): any;
}