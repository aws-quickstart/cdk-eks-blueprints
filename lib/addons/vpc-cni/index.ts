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
   * Metadata applied to ENI helps you categorize and organize your 
   * resources for billing or other purposes. 
   */
  additionalEniTags?: string;
  /**
   * `ANNOTATE_POD_IP` Environment Variable. Format `boolean`.
   * Setting ANNOTATE_POD_IP to true will allow IPAMD to add an annotation 
   * vpc.amazonaws.com/pod-ips to the pod with pod IP.
   */
  annotatePodIp?: string;
  /**
  * `AWS_VPC_CNI_NODE_PORT_SUPPORT` Environment Variable. Format `boolean`.
  * Specifies whether NodePort services are enabled on a worker node's primary 
  * network interface. 
  */
  awsVpcCniNodePortSupport?: string;
  /**
  * `AWS_VPC_ENI_MTU` Environment Variable. Format `integer`.
  * Used to configure the MTU size for attached ENIs. The valid range is 
  * from 576 to 9001.
  */
  awsVpcEniMtu?: string;
  /**
  * `AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER` Environment Variable. Format `boolean`.
  * Specifies whether ipamd should configure rp filter for primary interface. 
  * Setting this to false will require rp filter to be configured through init 
  * container.
  */
  awsVpcK8sCniConfigureRpfilter?: string;
  /**
  * `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` Environment Variable. Format `boolean`.
  * Specifies that your pods may use subnets and security groups that are 
  * independent of your worker node's VPC configuration.
  */
  awsVpcK8sCniCustomNetworkCfg?: string;
  /**
  * `AWS_VPC_K8S_CNI_VETHPREFIX` Environment Variable. Format `boolean`.
  * Specifies the veth prefix used to generate the host-side veth device name 
  * for the CNI.
  */
  awsVpcK8sCniVethPrefix?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOGLEVEL` Environment Variable.
  * Specifies the loglevel for ipamd and cni-metric-helper.
  */
  awsVpcK8sCniLogLevel?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOG_FILE` Environment Variable.
  * Specifies where to write the logging output of ipamd. Either to stdout 
  * or to override the default file (i.e., /var/log/aws-routed-eni/ipamd.log).
  */
  awsVpcK8sCniLogFile?: string;
  /**
  * `AWS_VPC_K8S_CNI_RANDOMIZESNAT` Environment Variable.
  * Specifies whether the SNAT iptables rule should randomize the outgoing 
  * ports for connections.
  */
  awsVpcK8sCniRandomizeSnat?: string;
  /**
  * `AWS_VPC_K8S_CNI_EXTERNALSNAT` Environment Variable.
  * Specifies whether an external NAT gateway should be used to provide SNAT 
  * of secondary ENI IP addresses.
  */
  awsVpcK8sCniExternalSnat?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_FILE` Environment Variable.
  * Specifies where to write the logging output for aws-cni plugin. 
  */
  awsVpcK8sPluginLogFile?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_LEVEL` Environment Variable.
  * Specifies the loglevel for aws-cni plugin.
  */
  awsVpcK8sPluginLogLevel?: string;
  /**
  * `DISABLE_INTROSPECTION` Environment Variable. Format `boolean`.
  */
  disableIntrospection?: string;
  /**
  * `DISABLE_METRICS` Environment Variable. Format `boolean`.
  * Specifies whether the prometheus metrics endpoint is disabled or not for 
  * ipamd. By default metrics are published on :61678/metrics.
  */
  disableMetrics?: string;
  
  /**
  * `DISABLE_NETWORK_RESOURCE_PROVISIONING` Environment Variable. Format `boolean`.
  * Setting DISABLE_NETWORK_RESOURCE_PROVISIONING to true will make IPAMD 
  * depend only on IMDS to get attached ENIs and IPs/prefixes.
  */
  disablenetworkResourceProvisioning?: string;
  /**
  * `ENABLE_POD_ENI` Environment Variable. Format `boolean`.
  * Setting ENABLE_POD_ENI to true will allow IPAMD to add the 
  * vpc.amazonaws.com/has-trunk-attached label to the node if the instance 
  * has the capacity to attach an additional ENI.
  */
  enablePodEni?: string;
  /**
  * `ENABLE_PREFIX_DELEGATION` Environment Variable. Format `boolean`.
  * To enable prefix delegation on nitro instances. Setting 
  * ENABLE_PREFIX_DELEGATION to true will start allocating a prefix (/28 for IPv4 and /80 for IPv6) instead of a secondary IP in the ENIs subnet. 
  */
  enablePrefixDelegation?: string;
  /**
  * `WARM_ENI_TARGET` Environment Variable. Format `integer`.
  * Specifies the number of free elastic network interfaces (and all of their 
  * available IP addresses) that the ipamd daemon should attempt to keep 
  * available for pod assignment on the node. 
  */
  warmEniTarget?: string;
  /**
  * `WARM_PREFIX_TARGET` Environment Variable. Format `integer`.
  * Specifies the number of free IPv4(/28) prefixes that the ipamd daemon 
  * should attempt to keep available for pod assignment on the node.
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
      version: props?.version ?? "v1.12.0-eksbuild.1",
      saName: "vpc-cni",
      configurationValues: populateVpcCniConfigurationValues(props)  
    });
      
  }
}

function populateVpcCniConfigurationValues(props?: VpcCniAddOnProps): Values {
  if (props === null) {
    return {};
  }

  let values: Values = {};
  const result : Values = {
    Env: {
        ADDITIONAL_ENI_TAGS: props?.additionalEniTags, 
        ANNOTATE_POD_IP: props?.annotatePodIp,
        AWS_VPC_CNI_NODE_PORT_SUPPORT: props?.awsVpcCniNodePortSupport,
        AWS_VPC_ENI_MTU: props?.awsVpcEniMtu,
        AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER: props?.awsVpcK8sCniConfigureRpfilter,
        AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: props?.awsVpcK8sCniCustomNetworkCfg,
        AWS_VPC_K8S_CNI_EXTERNALSNAT: props?.awsVpcK8sCniExternalSnat,
        AWS_VPC_K8S_CNI_LOGLEVEL: props?.awsVpcK8sCniLogLevel,
        AWS_VPC_K8S_CNI_LOG_FILE: props?.awsVpcK8sCniLogFile,
        AWS_VPC_K8S_CNI_RANDOMIZESNAT: props?.awsVpcK8sCniRandomizeSnat,
        AWS_VPC_K8S_CNI_VETHPREFIX: props?.awsVpcK8sCniVethPrefix,
        AWS_VPC_K8S_PLUGIN_LOG_FILE: props?.awsVpcK8sCniLogFile,
        AWS_VPC_K8S_PLUGIN_LOG_LEVEL: props?.awsVpcK8sPluginLogLevel,
        DISABLE_INTROSPECTION: props?.disableIntrospection,
        DISABLE_METRICS: props?.disableMetrics,
        DISABLE_NETWORK_RESOURCE_PROVISIONING: props?.disablenetworkResourceProvisioning,
        ENABLE_POD_ENI: props?.enablePodEni,
        ENABLE_PREFIX_DELEGATION: props?.enablePrefixDelegation,
        WARM_ENI_TARGET: props?.warmEniTarget,
        WARM_PREFIX_TARGET: props?.warmPrefixTarget
    },
    Limits: {
      cpu: props?.cpuLimit,
      memory: props?.memoryLimit,
    }
  }

  // clean up all undefined
  Object.keys(result).forEach(key => values[key] === undefined ? delete values[key] : {});

  return values;
}