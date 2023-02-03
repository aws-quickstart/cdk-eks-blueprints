import { Values } from "../../spi";
import { CoreAddOn } from "../core-addon";

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
  awsVpcK8sCniRandomizeSnat?: string;
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