import { CapabilityType, ClusterInfo } from "./types";
import { Construct } from "constructs";
import { AckCapability } from "../capabilities/ack-capability";
import { ArgoCapability } from "../capabilities/argocd-capability";
import { KroCapability } from "../capabilities/kro-capability";

/**
 * ClusterCapability is the interface to which all EKS Capabilities will conform.
 */
export declare interface ClusterCapability {
  /**
   * CapabilityType
   */
  type:  CapabilityType

  /**
   * Creates the capability on the cluster
   * @param clusterInfo
   * @returns cdk.Construct
   */
  create(clusterInfo: ClusterInfo): Construct
}

/**
 * Typed map of EKS capabilities. Each key can only appear once.
 */
export interface ClusterCapabilities {
  ack?: AckCapability;
  argocd?: ArgoCapability;
  kro?: KroCapability;
}
