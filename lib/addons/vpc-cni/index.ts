import { Values } from "../../spi";
import { CoreAddOn } from "../core-addon";

/**
 * User provided option for the Helm Chart
 */
export interface VpcCniAddOnProps {
  /**
   * Version of the addon.
   */
  version?: string;
  /**
   * `ADDITIONAL_ENI_TAGS` Environment Variable. 
   */
  additionalEniTags?: string;
  /**
   * `ANNOTATE_POD_IP` Environment Variable. Format `boolean`
   */
  annotatePodIp?: string;
  /**
  * `AWS_VPC_CNI_NODE_PORT_SUPPORT` Environment Variable. Format `boolean`
  */
  awsVpcCniNodePortSupport?: string;
  /**
  * `AWS_VPC_ENI_MTU` Environment Variable. Format `integer`
  */
  awsVpcEniMtu?: string;
  /**
  * `AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniConfigureRpfilter?: string;
  /**
  * `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniCustomNetworkCfg?: string;
  /**
  * `AWS_VPC_K8S_CNI_VETHPREFIX` Environment Variable. Format `boolean`
  */
  awsVpcK8sCniVethPrefix?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOGLEVEL` Environment Variable.
  */
  awsVpcK8sCniLogLevel?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOG_FILE` Environment Variable.
  */
  awsVpcK8sCniLogFile?: string;
  /**
  * `AWS_VPC_K8S_CNI_RANDOMIZESNAT` Environment Variable.
  */
  awsVpcK8sCniRandomizeSnat?: string;
  /**
  * `AWS_VPC_K8S_CNI_EXTERNALSNAT` Environment Variable.
  */
  awsVpcK8sCniExternalSnat?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_FILE` Environment Variable.
  */
  awsVpcK8sPluginLogFile?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_LEVEL` Environment Variable.
  */
  awsVpcK8sPluginLogLevel?: string;
  /**
  * `DISABLE_INTROSPECTION` Environment Variable. Format `boolean`
  */
  disableIntrospection?: string;
  /**
  * `DISABLE_METRICS` Environment Variable. Format `boolean`
  */
  disableMetrics?: string;
  
  /**
  * `DISABLE_NETWORK_RESOURCE_PROVISIONING` Environment Variable. Format `boolean`
  */
  disablenetworkResourceProvisioning?: string;
  /**
  * `ENABLE_POD_ENI` Environment Variable. Format `boolean`
  */
  enablePodEni?: string;
  /**
  * `ENABLE_PREFIX_DELEGATION` Environment Variable. Format `boolean`
  */
  enablePrefixDelegation?: string;
  /**
  * `WARM_ENI_TARGET` Environment Variable. Format `integer`
  */
  warmEniTarget?: string;
  /**
  * `WARM_PREFIX_TARGET` Environment Variable. Format `integer`
  */
  warmPrefixTarget?: string;
  /**
  * `cpu` Limits.
  */
  cpuLimit?: string;
  /**
  * `memory` Limits.
  */
  memoryLimit?: string;
}

/**
 * Implementation of VpcCni EKS add-on with Advanced Configurations.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(props?: VpcCniAddOnProps) {
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
  const result : Values = {
    Env: {
        ADDITIONAL_ENI_TAGS: props.additionalEniTags, 
        ANNOTATE_POD_IP: props.annotatePodIp,
        AWS_VPC_CNI_NODE_PORT_SUPPORT: props.awsVpcCniNodePortSupport,
        AWS_VPC_ENI_MTU: props.awsVpcEniMtu,
        AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER: props.awsVpcK8sCniConfigureRpfilter,
        AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: props.awsVpcK8sCniCustomNetworkCfg,
        AWS_VPC_K8S_CNI_EXTERNALSNAT: props.awsVpcK8sCniExternalSnat,
        AWS_VPC_K8S_CNI_LOGLEVEL: props.awsVpcK8sCniLogLevel,
        AWS_VPC_K8S_CNI_LOG_FILE: props.awsVpcK8sCniLogFile,
        AWS_VPC_K8S_CNI_RANDOMIZESNAT: props.awsVpcK8sCniRandomizeSnat,
        AWS_VPC_K8S_CNI_VETHPREFIX: props.awsVpcK8sCniVethPrefix,
        AWS_VPC_K8S_PLUGIN_LOG_FILE: props.awsVpcK8sCniLogFile,
        AWS_VPC_K8S_PLUGIN_LOG_LEVEL: props.awsVpcK8sPluginLogLevel,
        DISABLE_INTROSPECTION: props.disableIntrospection,
        DISABLE_METRICS: props.disableMetrics,
        DISABLE_NETWORK_RESOURCE_PROVISIONING: props.disablenetworkResourceProvisioning,
        ENABLE_POD_ENI: props.enablePodEni,
        // How can we read GlobalResouces.secondaryCidr from here?
        ENABLE_PREFIX_DELEGATION: props.enablePrefixDelegation,
        WARM_ENI_TARGET: props.warmEniTarget,
        WARM_PREFIX_TARGET: props.warmPrefixTarget
    },
    Limits: {
      cpu: props.cpuLimit,
      memory: props.memoryLimit,
    }
  }

  // clean up all undefined
  Object.keys(result).forEach(key => values[key] === undefined ? delete values[key] : {});

  return values;
}