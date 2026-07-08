import { CapabilityType } from "../spi";
import { Capability, CapabilityProps } from "./capability";

/**
 * Properties for KroCapability
 */
export type KroCapabilityProps = Omit<CapabilityProps, "type">;

/**
 * KRO (Kubernetes Resource Orchestrator) capability for EKS clusters.
 * Enables advanced resource orchestration and management within Kubernetes.
 */
export class KroCapability extends Capability {
  readonly DEFAULT_POLICY_NAME = undefined;
  
  /** Default configuration for KRO capabilities */
  static readonly defaultProps: KroCapabilityProps = {
    capabilityName: "blueprints-kro-capability"
  };

  /**
   * Creates a new KRO capability instance.
   * 
   * @param options - Configuration options for the KRO capability
   */
  constructor(readonly options?: KroCapabilityProps){
    super({...KroCapability.defaultProps, ...options, type: CapabilityType.KRO});
  }
}
