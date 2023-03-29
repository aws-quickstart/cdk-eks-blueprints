import { ClusterInfo, Values } from "../../spi";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { loadYaml, readYamlDocument } from "../../utils";
import { Construct } from 'constructs';
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { ISubnet } from "aws-cdk-lib/aws-ec2";

/**
 * User provided option for the Helm Chart
 */
export interface VpcCniAddOnProps {

  /**
   * `ADDITIONAL_ENI_TAGS` Environment Variable. Type: String.
   * Metadata applied to ENI helps you categorize and organize your 
   * resources for billing or other purposes. 
   */
  additionalEniTags?: string
  /**
   * `ANNOTATE_POD_IP` Environment Variable. Type: Boolean.
   * Setting ANNOTATE_POD_IP to true will allow IPAMD to add an annotation 
   * vpc.amazonaws.com/pod-ips to the pod with pod IP.
   */
  annotatePodIp?: boolean;
  /**
  * `AWS_VPC_CNI_NODE_PORT_SUPPORT` Environment Variable. Type: Boolean.
  * Specifies whether NodePort services are enabled on a worker node's primary 
  * network interface. 
  */
  awsVpcCniNodePortSupport?: boolean;
  /**
  * `AWS_VPC_ENI_MTU` Environment Variable. Type: Integer.
  * Used to configure the MTU size for attached ENIs. The valid range is 
  * from 576 to 9001.
  */
  awsVpcEniMtu?: number;
  /**
  * `AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER` Environment Variable. Type: Boolean.
  * Specifies whether ipamd should configure rp filter for primary interface. 
  * Setting this to false will require rp filter to be configured through init 
  * container.
  */
  awsVpcK8sCniConfigureRpfilter?: boolean;
  /**
  * `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` Environment Variable. Type: Boolean.
  * Specifies that your pods may use subnets and security groups that are 
  * independent of your worker node's VPC configuration.
  */
  awsVpcK8sCniCustomNetworkCfg?: boolean;
  /**
  * `ENI_CONFIG_LABEL_DEF` Environment Variable. Type: String.
  * Specifies node label key name. This should be used when 
  * AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true.
  */
  eniConfigLabelDef?: string;
  /**
  * `ENI_CONFIG_ANNOTATION_DEF` Environment Variable. Type: String. 
  * Specifies node annotation key name. This should be used when 
  * AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true
  */
  eniConfigAnnotationDef?: string;
  /**
  * `AWS_VPC_K8S_CNI_VETHPREFIX` Environment Variable. Type: String.
  * Specifies the veth prefix used to generate the host-side veth device name 
  * for the CNI.
  */
  awsVpcK8sCniVethPrefix?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOGLEVEL` Environment Variable. Type: String.
  * Specifies the loglevel for ipamd and cni-metric-helper.
  */
  awsVpcK8sCniLogLevel?: string;
  /**
  * `AWS_VPC_K8S_CNI_LOG_FILE` Environment Variable. Type: String.
  * Specifies where to write the logging output of ipamd. Either to stdout 
  * or to override the default file (i.e., /var/log/aws-routed-eni/ipamd.log).
  */
  awsVpcK8sCniLogFile?: string;
  /**
  * `AWS_VPC_K8S_CNI_RANDOMIZESNAT` Environment Variable. Type: String.
  * Specifies whether the SNAT iptables rule should randomize the outgoing 
  * ports for connections.
  */
  awsVpcK8sCniRandomizeSnat?: string;
  /**
  * `AWS_VPC_K8S_CNI_EXTERNALSNAT` Environment Variable. Type: Boolean.
  * Specifies whether an external NAT gateway should be used to provide SNAT 
  * of secondary ENI IP addresses.
  */
  awsVpcK8sCniExternalSnat?: boolean;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_FILE` Environment Variable. Type: String.
  * Specifies where to write the logging output for aws-cni plugin. 
  */
  awsVpcK8sPluginLogFile?: string;
  /**
  * `AWS_VPC_K8S_PLUGIN_LOG_LEVEL` Environment Variable. Type: String.
  * Specifies the loglevel for aws-cni plugin.
  */
  awsVpcK8sPluginLogLevel?: string;
  /**
  * `DISABLE_INTROSPECTION` Environment Variable. Type: Boolean.
  */
  disableIntrospection?: boolean;
  /**
  * `DISABLE_METRICS` Environment Variable. Type: Boolean.
  * Specifies whether the prometheus metrics endpoint is disabled or not for 
  * ipamd. By default metrics are published on :61678/metrics.
  */
  disableMetrics?: boolean;
  /**
  * `DISABLE_NETWORK_RESOURCE_PROVISIONING` Environment Variable. Type: Boolean.
  * Setting DISABLE_NETWORK_RESOURCE_PROVISIONING to true will make IPAMD 
  * depend only on IMDS to get attached ENIs and IPs/prefixes.
  */
  disablenetworkResourceProvisioning?: boolean;
  /**
  * `ENABLE_POD_ENI` Environment Variable. Type: Boolean.
  * Setting ENABLE_POD_ENI to true will allow IPAMD to add the 
  * vpc.amazonaws.com/has-trunk-attached label to the node if the instance 
  * has the capacity to attach an additional ENI.
  */
  enablePodEni?: boolean;
  /**
  * `ENABLE_PREFIX_DELEGATION` Environment Variable. Type: Boolean.
  * To enable prefix delegation on nitro instances. Setting 
  * ENABLE_PREFIX_DELEGATION to true will start allocating a prefix (/28 for IPv4 and /80 for IPv6) instead of a secondary IP in the ENIs subnet. 
  */
  enablePrefixDelegation?: boolean;
  /**
  * `WARM_ENI_TARGET` Environment Variable. Format integer.
  * Specifies the number of free elastic network interfaces (and all of their 
  * available IP addresses) that the ipamd daemon should attempt to keep 
  * available for pod assignment on the node. 
  */
  warmEniTarget?: number;
  /**
  * `WARM_PREFIX_TARGET` Environment Variable. Format integer.
  * Specifies the number of free IPv4(/28) prefixes that the ipamd daemon 
  * should attempt to keep available for pod assignment on the node.
  */
  warmPrefixTarget?: number;
  /**
   * CustomNetworkingConfig holding Secondary Subnet IDs for creating `ENIConfig`
   */
  customNetworkingConfig?: CustomNetworkingConfig;
}


export interface CustomNetworkingConfig {
  /**
   * Secondary subnets of your VPC
   */
  readonly subnets?: ISubnet[];
}

const defaultProps: CoreAddOnProps = {
  addOnName: 'vpc-cni',
  version: 'v1.12.5-eksbuild.2',
  saName: 'vpc-cni',
  namespace: 'kube-system',
  controlPlaneAddOn: true,
  configurationValues: {}
};

/**
 * Implementation of VpcCni EKS add-on with Advanced Configurations.
 */
export class VpcCniAddOn extends CoreAddOn {
    
  readonly vpcCniAddOnProps: VpcCniAddOnProps;
  readonly id? : string;

  constructor(props?: VpcCniAddOnProps) {
    super({...defaultProps, ...props});
    this.vpcCniAddOnProps = { ...defaultProps, ...props, };
    (this.coreAddOnProps.configurationValues as any) = populateVpcCniConfigurationValues(props);
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
      const cluster = clusterInfo.cluster;
      let clusterSecurityGroupId = cluster.clusterSecurityGroupId;

      if ((this.vpcCniAddOnProps.customNetworkingConfig?.subnets)) {
        for (let subnet of this.vpcCniAddOnProps.customNetworkingConfig.subnets) {
          const doc = readYamlDocument(__dirname + '/eniConfig.ytpl');
          const manifest = doc.split("---").map(e => loadYaml(e));
          const values: Values = {
              availabilityZone: subnet.availabilityZone,
              clusterSecurityGroupId: clusterSecurityGroupId,
              subnetId: subnet.subnetId  
          };
          const manifestDeployment: ManifestDeployment = {
            name: "EniCustomConfig" + subnet,
            namespace: this.coreAddOnProps.namespace!,
            manifest,
            values,
          };
          const kubectlProvider = new KubectlProvider(clusterInfo);
          kubectlProvider.addManifest(manifestDeployment);
        }
      }
      const addOnPromise = super.deploy(clusterInfo);
      return addOnPromise;
  }
}

function populateVpcCniConfigurationValues(props?: VpcCniAddOnProps): Values {
  if (props === null) {
    return {};
  }

  const result : Values = {
    env: {
        ADDITIONAL_ENI_TAGS: props?.additionalEniTags, 
        ANNOTATE_POD_IP: props?.annotatePodIp,
        AWS_VPC_CNI_NODE_PORT_SUPPORT: props?.awsVpcCniNodePortSupport,
        AWS_VPC_ENI_MTU: props?.awsVpcEniMtu,
        AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER: props?.awsVpcK8sCniConfigureRpfilter,
        AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: props?.awsVpcK8sCniCustomNetworkCfg,
        ENI_CONFIG_LABEL_DEF: props?.eniConfigLabelDef,
        ENI_CONFIG_ANNOTATION_DEF: props?.eniConfigAnnotationDef,
        AWS_VPC_K8S_CNI_EXTERNALSNAT: props?.awsVpcK8sCniExternalSnat,
        AWS_VPC_K8S_CNI_LOGLEVEL: props?.awsVpcK8sCniLogLevel,
        AWS_VPC_K8S_CNI_LOG_FILE: props?.awsVpcK8sCniLogFile,
        AWS_VPC_K8S_CNI_RANDOMIZESNAT: props?.awsVpcK8sCniRandomizeSnat,
        AWS_VPC_K8S_CNI_VETHPREFIX: props?.awsVpcK8sCniVethPrefix,
        AWS_VPC_K8S_PLUGIN_LOG_FILE: props?.awsVpcK8sPluginLogFile,
        AWS_VPC_K8S_PLUGIN_LOG_LEVEL: props?.awsVpcK8sPluginLogLevel,
        DISABLE_INTROSPECTION: props?.disableIntrospection,
        DISABLE_METRICS: props?.disableMetrics,
        DISABLE_NETWORK_RESOURCE_PROVISIONING: props?.disablenetworkResourceProvisioning,
        ENABLE_POD_ENI: props?.enablePodEni,
        ENABLE_PREFIX_DELEGATION: props?.enablePrefixDelegation,
        WARM_ENI_TARGET: props?.warmEniTarget,
        WARM_PREFIX_TARGET: props?.warmPrefixTarget
    }
  };

  // clean up all undefined
  const values = result.env;
  Object.keys(values).forEach(key => values[key] === undefined ? delete values[key] : {});
  Object.keys(values).forEach(key => values[key] = typeof values[key] !== 'string' ?  JSON.stringify(values[key]):values[key]);
  
  return result;
}
