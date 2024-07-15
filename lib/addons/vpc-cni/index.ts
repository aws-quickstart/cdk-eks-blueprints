import { ISecurityGroup, ISubnet } from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from 'constructs';
import { ClusterInfo, Values } from "../../spi";
import { loadYaml, readYamlDocument, ReplaceServiceAccount, supportsALL } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
  [KubernetesVersion.V1_30, "v1.18.1-eksbuild.3"],
  [KubernetesVersion.V1_29, "v1.16.0-eksbuild.1"],
  [KubernetesVersion.V1_28, "v1.15.1-eksbuild.1"],
  [KubernetesVersion.V1_27, "v1.15.1-eksbuild.1"],
  [KubernetesVersion.V1_26, "v1.15.1-eksbuild.1"],
]);

/**
 * User provided option for the Helm Chart
 */
export interface VpcCniAddOnProps {

  /**
   * `ADDITIONAL_ENI_TAGS` Environment Variable. Type: String.
   * Metadata applied to ENI helps you categorize and organize your 
   * resources for billing or other purposes. 
   */
  additionalEniTags?: string;

  /**
   * `ANNOTATE_POD_IP` Environment Variable. Type: Boolean.
   * Setting ANNOTATE_POD_IP to true will allow IPAMD to add an annotation 
   * vpc.amazonaws.com/pod-ips to the pod with pod IP.
   */
  annotatePodIp?: boolean;

  /**
   * `AWS_EC2_ENDPOINT` Environment Variable. Type: string.
   * Specifies the EC2 endpoint to use. This is useful if you 
   * are using a custom endpoint for EC2.  
   */
  awsEc2Endpoint?: string;

  /**
   * `AWS_EXTERNAL_SERVICE_CIDRS` Environment Variable. Type: string.
   * Specify a comma-separated list of IPv4 CIDRs that must be routed 
   * via main routing table. This is required for secondary ENIs to reach 
   * endpoints outside of VPC that are backed by a service. 
   */
  awsExternalServiceCidrs?: string;

  /**
   * `AWS_MANAGE_ENIS_NON_SCHEDULABLE` Environment Variable. Type: Boolean.
   * Specifies whether IPAMD should allocate or deallocate ENIs on a non-schedulable 
   * node.
   */
  awsManageEnisNonSchedulable?: boolean;

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
  * `AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG` Environment Variable. Type: Boolean.
  * Specifies that your pods may use subnets and security groups that are 
  * independent of your worker node's VPC configuration.
  */
  awsVpcK8sCniCustomNetworkCfg?: boolean;

  /**
  * `AWS_VPC_K8S_CNI_VETHPREFIX` Environment Variable. Type: String.
  * Specifies the veth prefix used to generate the host-side veth device name 
  * for the CNI.
  */
  awsVpcK8sCniVethPrefix?: string;

  /**
  * `AWS_VPC_K8S_CNI_EXCLUDE_SNAT_CIDRS` Environment Variable. Type: String.
  Specify a comma-separated list of IPv4 CIDRs to exclude from SNAT.
  */
  awsVpcK8sExcludeSnatCidrs?: string;

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
   * `CLUSTER_ENDPOINT` Environment Variable. Type: String.
   * Specifies the cluster endpoint to use for connecting to 
   * the api-server without relying on kube-proxy. 
   */
  clusterEndpoint?: string;

  /**
   * CustomNetworkingConfig holding Secondary Subnet IDs for creating `ENIConfig`
   */
  customNetworkingConfig?: CustomNetworkingConfig;

  /**
   * `DISABLE_LEAKED_ENI_CLEANUP` Environment Variable. Type: Boolean.
   */
  disableLeakedEniCleanup?: boolean;

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
  * `DISABLE_TCP_EARLY_DEMUX` Environment Variable. Type: Boolean.
  * If ENABLE_POD_ENI is set to true, for the kubelet to connect via TCP
  * to pods that are using per pod security groups, DISABLE_TCP_EARLY_DEMUX 
  * should be set to true for amazon-k8s-cni-init the container under initcontainers.
  */
  disableTcpEarlyDemux?: boolean;

  /**
  * `ENABLE_BANDWIDTH_PLUGIN` Environment Variable. Type: Boolean.
  * Setting ENABLE_BANDWIDTH_PLUGIN to true will update 10-aws.conflist to 
  * include upstream bandwidth plugin as a chained plugin.
  */
  enableBandwidthPlugin?: boolean;

  /**
  * `ENABLE_NFTABLES` Environment Variable. Type: Boolean.
  * VPC CNI uses iptables-legacy by default. Setting ENABLE_NFTABLES 
  * to true will update VPC CNI to use iptables-nft
  */
  enableNftables?: boolean;

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
  * `ENABLE_V6_EGRESS` Environment Variable. Type: Boolean.
  * Specifies whether PODs in an IPv4 cluster support IPv6 egress. 
  * If env is set to true, range fd00::ac:00/118 is reserved for IPv6 egress.
  */
  enableV6Egress?: boolean;

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
   * `INTROSPECTION_BIND_ADDRESS` Environment Variable. Type: String. 
   * Specifies the bind address for the introspection endpoint.
  */
  introspectionBindAddress?: string;

  /**
  * `MAX_ENI` Environment Variable. Format integer.
  * Specifies the maximum number of ENIs that will be attached to the node. 
  */
  maxEni?: number;

  /**
  * `MINIMUM_IP_TARGET` Environment Variable. Format integer.
  * Specifies the number of total IP addresses that the ipamd 
  * daemon should attempt to allocate for pod assignment on the node.
  */
  minimumIpTarget?: number;

  /**
   * `POD_SECURITY_GROUP_ENFORCING_MODE` Environment Variable. Type: String. 
   * Once ENABLE_POD_ENI is set to true, this value controls how the traffic 
   * of pods with the security group behaves.
  */
  podSecurityGroupEnforcingMode?: string;

  /**
  * `WARM_ENI_TARGET` Environment Variable. Format integer.
  * Specifies the number of free elastic network interfaces (and all of their 
  * available IP addresses) that the ipamd daemon should attempt to keep 
  * available for pod assignment on the node. 
  */
  warmEniTarget?: number;

  /**
  * `WARM_IP_TARGET` Environment Variable. Format integer.
  * Specifies the number of free IP addresses that the ipamd daemon 
  * should attempt to keep available for pod assignment on the node.
  */
  warmIpTarget?: number;

  /**
  * `WARM_PREFIX_TARGET` Environment Variable. Format integer.
  * Specifies the number of free IPv4(/28) prefixes that the ipamd daemon 
  * should attempt to keep available for pod assignment on the node.
  */
  warmPrefixTarget?: number;

  /**
   * If specified, an IRSA account will be created for the VPC-CNI add-on with the IRSA role
   * having the specified managed policies. When specified, the node role for the cluster provider can be configured 
   * without the CNI policy. 
   * 
   * For IPv4 the required managed policy is AmazonEKS_CNI_Policy.
   * @example
   * serviceAccountPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy")]
   * 
   */
  serviceAccountPolicies?: iam.IManagedPolicy[];

  /**
   * Enable kubernetes network policy in the VPC CNI introduced in vpc-cni 1.14
   * More informaton on official AWS documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
   * 
   */
  enableNetworkPolicy?: boolean;

  /**
   * Enable windows support for your cluster
   * 
   */
  enableWindowsIpam?: boolean;

  /**
   * Enable prefix delegation for windows
   */
  enableWindowsPrefixDelegation?: boolean;

  /**
   * `warm-prefix-target` value in amazon-vpc-cni config map. Format integer.
   * Specifies the number of free IPv4(/28) prefixes that the ipamd daemon
   * should attempt to keep available for pod assignment on the node.
   */
  warmWindowsPrefixTarget?: number;

  /**
   * `warm-ip-target` value in amazon-vpc-cni config map. Format integer.
   * Specifies the number of free IP addresses that the ipamd daemon
   * should attempt to keep available for pod assignment on Windows nodes.
   */
  warmWindowsIPTarget?: number;

  /**
   * `minimum-ip-target` value in amazon-vpc-cni config map. Format integer.
   * Specifies the number of total IP addresses that the ipamd
   * daemon should attempt to allocate for pod assignment on a Window nodes.
   */
  minimumWindowsIPTarget?: number;

  /**
   * `branch-eni-cooldown` value in amazon-vpc-cni config map. Format integer.
   */
  branchENICooldown?: number;

  /**
   * Version of the add-on to use. Must match the version of the cluster where it
   * will be deployed.
   */

  version?: string;
}


export interface CustomNetworkingConfig {
  /**
   * Secondary subnets of your VPC
   */
  readonly subnets?: ISubnet[];
  /**
   * Security group of secondary ENI
   */
  readonly securityGroup?: ISecurityGroup;
}

const defaultProps: CoreAddOnProps = {
  addOnName: 'vpc-cni',
  version: 'auto',
  versionMap: versionMap,
  saName: 'aws-node',
  namespace: 'kube-system',
  controlPlaneAddOn: false,
  configurationValues: {}
};

/**
 * Implementation of VpcCni EKS add-on with Advanced Configurations.
 */
@supportsALL
export class VpcCniAddOn extends CoreAddOn {

  readonly vpcCniAddOnProps: VpcCniAddOnProps;
  readonly id?: string;

  constructor(props?: VpcCniAddOnProps) {
    super({ ...defaultProps, ...props });
    this.vpcCniAddOnProps = { ...defaultProps, ...props };
    (this.coreAddOnProps.configurationValues as any) = populateVpcCniConfigurationValues(props);
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    let securityGroupId = cluster.clusterSecurityGroupId;

    if (this.vpcCniAddOnProps.customNetworkingConfig?.securityGroup) {
      securityGroupId = this.vpcCniAddOnProps.customNetworkingConfig.securityGroup.securityGroupId;
    }

    if ((this.vpcCniAddOnProps.customNetworkingConfig?.subnets)) {
      for (let subnet of this.vpcCniAddOnProps.customNetworkingConfig.subnets) {
        const doc = readYamlDocument(__dirname + '/eniConfig.ytpl');
        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
          availabilityZone: subnet.availabilityZone,
          securityGroupId: securityGroupId,
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

  /**
   * Overrides the core method to provide managed policies.
   * @param _clusterInfo 
   * @returns 
   */
  provideManagedPolicies(_clusterInfo: ClusterInfo): iam.IManagedPolicy[] | undefined {
    return this.vpcCniAddOnProps.serviceAccountPolicies;
  }

  /**
   * Overrides the core addon method in order to replace the SA if exists (which is the case for aws-node).
   * @param clusterInfo 
   * @param saNamespace 
   * @param policies 
   * @returns 
   */
  createServiceAccount(clusterInfo: ClusterInfo, saNamespace: string, policies: iam.IManagedPolicy[]): eks.ServiceAccount {
    const sa = new ReplaceServiceAccount(clusterInfo.cluster, `${this.coreAddOnProps.saName}-sa`, {
      cluster: clusterInfo.cluster,
      name: this.coreAddOnProps.saName,
      namespace: saNamespace
    });

    policies.forEach(p => sa.role.addManagedPolicy(p));
    return sa as any as eks.ServiceAccount;
  }
}

function populateVpcCniConfigurationValues(props?: VpcCniAddOnProps): Values {
  if (props === null) {
    return {};
  }

  const result: Values = {
    init: {
      env: {
        DISABLE_TCP_EARLY_DEMUX: props?.disableTcpEarlyDemux,
        ENABLE_V6_EGRESS: props?.enableV6Egress,
      }
    },
    env: {
      AWS_EC2_ENDPOINT: props?.awsEc2Endpoint,
      ADDITIONAL_ENI_TAGS: props?.additionalEniTags,
      ANNOTATE_POD_IP: props?.annotatePodIp,
      AWS_EXTERNAL_SERVICE_CIDR: props?.awsExternalServiceCidrs,
      AWS_MANAGE_ENIS_NON_SCHEDULABLE: props?.awsManageEnisNonSchedulable,
      AWS_VPC_CNI_NODE_PORT_SUPPORT: props?.awsVpcCniNodePortSupport,
      AWS_VPC_ENI_MTU: props?.awsVpcEniMtu,
      AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: props?.awsVpcK8sCniCustomNetworkCfg,
      AWS_VPC_K8S_CNI_EXCLUDE_SNAT_CIDRS: props?.awsVpcK8sExcludeSnatCidrs,
      ENI_CONFIG_LABEL_DEF: props?.eniConfigLabelDef,
      ENI_CONFIG_ANNOTATION_DEF: props?.eniConfigAnnotationDef,
      AWS_VPC_K8S_CNI_EXTERNALSNAT: props?.awsVpcK8sCniExternalSnat,
      AWS_VPC_K8S_CNI_LOGLEVEL: props?.awsVpcK8sCniLogLevel,
      AWS_VPC_K8S_CNI_LOG_FILE: props?.awsVpcK8sCniLogFile,
      AWS_VPC_K8S_CNI_RANDOMIZESNAT: props?.awsVpcK8sCniRandomizeSnat,
      AWS_VPC_K8S_CNI_VETHPREFIX: props?.awsVpcK8sCniVethPrefix,
      AWS_VPC_K8S_PLUGIN_LOG_FILE: props?.awsVpcK8sPluginLogFile,
      AWS_VPC_K8S_PLUGIN_LOG_LEVEL: props?.awsVpcK8sPluginLogLevel,
      CLUSTER_ENDPOINT: props?.clusterEndpoint,
      DISABLE_LEAKED_ENI_CLEANUP: props?.disableLeakedEniCleanup,
      DISABLE_INTROSPECTION: props?.disableIntrospection,
      DISABLE_METRICS: props?.disableMetrics,
      DISABLE_NETWORK_RESOURCE_PROVISIONING: props?.disablenetworkResourceProvisioning,
      ENABLE_BANDWIDTH_PLUGIN: props?.enableBandwidthPlugin,
      ENABLE_NFTABLES: props?.enableNftables,
      ENABLE_POD_ENI: props?.enablePodEni,
      ENABLE_PREFIX_DELEGATION: props?.enablePrefixDelegation,
      INTROSPECTION_BIND_ADDRESS: props?.introspectionBindAddress,
      MAX_ENI: props?.maxEni,
      MINIMUM_IP_TARGET: props?.minimumIpTarget,
      POD_SECURITY_GROUP_ENFORCING_MODE: props?.podSecurityGroupEnforcingMode,
      WARM_ENI_TARGET: props?.warmEniTarget,
      WARM_IP_TARGET: props?.warmIpTarget,
      WARM_PREFIX_TARGET: props?.warmPrefixTarget,
    },
    enableNetworkPolicy: JSON.stringify(props?.enableNetworkPolicy),
    enableWindowsIpam: JSON.stringify(props?.enableWindowsIpam),
    enableWindowsPrefixDelegation: JSON.stringify(props?.enableWindowsPrefixDelegation),
    warmWindowsPrefixTarget: JSON.stringify(props?.warmWindowsPrefixTarget),
    warmWindowsIPTarget: JSON.stringify(props?.warmWindowsIPTarget),
    minimumWindowsIPTarget: JSON.stringify(props?.minimumWindowsIPTarget),
    branchENICooldown: JSON.stringify(props?.branchENICooldown)
  };

  // clean up all undefined
  const values = result.env;
  Object.keys(values).forEach(key => values[key] === undefined ? delete values[key] : {});
  Object.keys(values).forEach(key => values[key] = typeof values[key] !== 'string' ? JSON.stringify(values[key]) : values[key]);

  // clean up all undefined on Init env
  const initValues = result.init.env;
  Object.keys(initValues).forEach(key => initValues[key] === undefined ? delete initValues[key] : {});
  Object.keys(initValues).forEach(key => initValues[key] = typeof initValues[key] !== 'string' ? JSON.stringify(initValues[key]) : initValues[key]);

  return result;
}
