import { Values } from "../../spi";
import { setPath } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";

/**
 * User provided option for the Helm Chart
 */
export interface VpcCniAddOnProps {
  /**
   * Required identified, must be unique within the parent stack scope.
   */
  version?: string;
  /**
   * Version of the addon.
   */
  additionalEniTags?: string;
  /**
   * `ADDITIONAL_ENI_TAGS` Environment Variable. 
   */
  annotatePodIp?: string;
  /**
   * `ANNOTATE_POD_IP` Environment Variable. Format `boolean`
   */
  awsVpcCniNodePortSupport?: string;
  /**
  * `AWS_VPC_CNI_NODE_PORT_SUPPORT` Environment Variable. Format `boolean`
  */
  awsVpcEniMtu?: string;
  /**
  * `AWS_VPC_ENI_MTU` Environment Variable. Format `integer`
  */
  awsVpcK8sCniConfigureRpfilter?: string;
  /**
  * `AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniCustomNetworkCfg?: string;
  /**
  * `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniVethPrefix?: string;
  /**
  * `AWS_VPC_K8S_CNI_VETHPREFIX` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniLogLevel?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOGLEVEL` Environment Variable.
  */
  awsVpcK8sCniLogFile?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOG_FILE` Environment Variable.
  */
  awsVpcK8sCniRandomizeSnat: string;
  /**
  * `AWS_VPC_K8S_CNI_RANDOMIZESNAT` Environment Variable.
  */
  awsVpcK8sCniExternalSnat?: string;
  /**
  * `AWS_VPC_K8S_CNI_EXTERNALSNAT` Environment Variable.
  */
  awsVpcK8sPluginLogFile?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_FILE` Environment Variable.
  */
  awsVpcK8sPluginLogLevel?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_LEVEL` Environment Variable.
  */
  disableIntrospection?: string;
  /**
  * `DISABLE_INTROSPECTION` Environment Variable. Format `boolean`
  */
  disableMetrics?: string;
  /**
  * `DISABLE_METRICS` Environment Variable. Format `boolean`
  */
  disablenetworkResourceProvisioning?: string;
  /**
  * `DISABLE_NETWORK_RESOURCE_PROVISIONING` Environment Variable. Format `boolean`
  */
  enablePodEni?: string;
  /**
  * `ENABLE_POD_ENI` Environment Variable. Format `boolean`
  */
  enablePrefixDelegation?: string;
  /**
  * `ENABLE_PREFIX_DELEGATION` Environment Variable. Format `boolean`
  */
  warmEniTarget?: string;
  /**
  * `WARM_ENI_TARGET` Environment Variable. Format `integer`
  */
  warmPrefixTarget?: string;
  /**
  * `WARM_PREFIX_TARGET` Environment Variable. Format `integer`
  */
  cpuLimit?: string;
  /**
  * `cpu` Limits.
  */
  memoryLimit?: string;
  /**
  * `memory` Limits.
  */
}

/**
 * Implementation of VpcCni EKS add-on with Advanced Configurations.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(props: VpcCniAddOnProps) {
        super({
            addOnName: "vpc-cni",
            version: props.version ?? "v1.12.0-eksbuild.1",
            saName: "vpc-cni",
            configurationValues: populateVpcCniConfigurationValues(props)
        });
    }
}

function populateVpcCniConfigurationValues(props: VpcCniAddOnProps): Values {
  let values: Values = {};
  if (props.additionalEniTags) {
    setPath(values,"Env.ADDITIONAL_ENI_TAGS", props.additionalEniTags);
  }
  if (props.annotatePodIp) {
    setPath(values,"Env.ANNOTATE_POD_IP", props.annotatePodIp);
  }
  if (props.awsVpcCniNodePortSupport) {
    setPath(values,"Env.AWS_VPC_CNI_NODE_PORT_SUPPORT", props.awsVpcCniNodePortSupport);
  }
  if (props.awsVpcEniMtu) {
    setPath(values,"Env.AWS_VPC_ENI_MTU", props.awsVpcEniMtu);
  }
  if (props.awsVpcK8sCniConfigureRpfilter) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER", props.awsVpcK8sCniConfigureRpfilter)
  }
  if (props.awsVpcK8sCniCustomNetworkCfg) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG", props.awsVpcK8sCniCustomNetworkCfg)
  }
  if (props.awsVpcK8sCniExternalSnat) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_EXTERNALSNAT", props.awsVpcK8sCniExternalSnat)
  }
  if (props.awsVpcK8sCniLogLevel) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_LOGLEVEL", props.awsVpcK8sCniLogLevel)
  }
  if (props.awsVpcK8sCniLogFile) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_LOG_FILE", props.awsVpcK8sCniLogFile)
  }
  if (props.awsVpcK8sCniRandomizeSnat) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_RANDOMIZESNAT", props.awsVpcK8sCniRandomizeSnat)
  }
  if (props.awsVpcK8sCniVethPrefix) {
    setPath(values,"Env.AWS_VPC_K8S_CNI_VETHPREFIX", props.awsVpcK8sCniVethPrefix)
  }
  if (props.awsVpcK8sPluginLogFile) {
    setPath(values,"Env.AWS_VPC_K8S_PLUGIN_LOG_FILE", props.awsVpcK8sCniLogFile)
  }
  if (props.awsVpcK8sPluginLogLevel) {
    setPath(values,"Env.AWS_VPC_K8S_PLUGIN_LOG_LEVEL", props.awsVpcK8sPluginLogLevel)
  }
  if (props.disableIntrospection) {
    setPath(values,"Env.DISABLE_INTROSPECTION", props.disableIntrospection)
  }
  if (props.disableMetrics) {
    setPath(values,"Env.DISABLE_METRICS", props.disableMetrics)
  }
  if (props.disablenetworkResourceProvisioning) {
    setPath(values,"Env.DISABLE_NETWORK_RESOURCE_PROVISIONING", props.disablenetworkResourceProvisioning)
  }
  if (props.enablePodEni) {
    setPath(values,"Env.ENABLE_POD_ENI", props.enablePodEni)
  }
  if (props.enablePrefixDelegation) {
    setPath(values,"Env.ENABLE_PREFIX_DELEGATION", props.enablePrefixDelegation)
  }
  if (props.warmEniTarget) {
    setPath(values,"Env.WARM_ENI_TARGET", props.warmEniTarget)
  }
  if (props.warmPrefixTarget) {
    setPath(values,"Env.WARM_PREFIX_TARGET", props.warmPrefixTarget)
  }
  if (props.cpuLimit) {
    setPath(values,"Limits.cpu", props.cpuLimit)
  }
  if (props.memoryLimit) {
    setPath(values,"Limits.memory", props.memoryLimit)
  }
  return values;
}