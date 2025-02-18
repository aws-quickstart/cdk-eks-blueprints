import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {
  CapacityType,
  KubernetesVersion,
  NodegroupAmiType,
} from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";
import * as blueprints from "../../lib";
import * as addons from "../../lib/addons";
import * as team from "../teams";
import { CfnWorkspace } from "aws-cdk-lib/aws-aps";
import {
  CreateEfsFileSystemProvider,
  CreateRoleProvider,
  CreateS3BucketProvider,
  GenericClusterProvider,
  ManagedNodeGroup,
} from "../../lib";

const burnhamManifestDir = "./examples/teams/team-burnham/";
const rikerManifestDir = "./examples/teams/team-riker/";
const teamManifestDirList = [burnhamManifestDir, rikerManifestDir];
const blueprintID = "blueprint-construct-dev";

export interface BlueprintConstructProps {
  /**
   * Id
   */
  id: string;
}

export default class BlueprintConstruct {
  teams: Array<blueprints.Team>;
  nodeRole: CreateRoleProvider;
  ampWorkspaceName: string;
  ampWorkspace: CfnWorkspace;
  apacheAirflowS3Bucket: CreateS3BucketProvider;
  apacheAirflowEfs: CreateEfsFileSystemProvider;
  addOns: Array<blueprints.ClusterAddOn>;
  clusterProvider: GenericClusterProvider;
  dataTeam: blueprints.EmrEksTeamProps;
  batchTeam: blueprints.BatchEksTeamProps;
  nodeClassSpec: blueprints.Ec2NodeClassSpec;
  nodePoolSpec: blueprints.NodePoolSpec;

  constructor(scope: Construct, props: cdk.StackProps) {
    blueprints.HelmAddOn.validateHelmVersions = true;
    blueprints.HelmAddOn.failOnVersionValidation = false;

    this.teams = [
      new team.TeamTroi(),
      new team.TeamRiker(scope, teamManifestDirList[1]),
      new team.TeamBurnham(scope, teamManifestDirList[0]),
      new team.TeamPlatform(process.env.CDK_DEFAULT_ACCOUNT!),
    ];

    this.nodeRole = new blueprints.CreateRoleProvider(
      "blueprint-node-role",
      new iam.ServicePrincipal("ec2.amazonaws.com"),
      [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonEC2ContainerRegistryReadOnly"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ]
    );

    this.ampWorkspaceName = "blueprints-amp-workspace";
    this.ampWorkspace = blueprints.getNamedResource(this.ampWorkspaceName);

    this.apacheAirflowS3Bucket = new blueprints.CreateS3BucketProvider({
      id: "apache-airflow-s3-bucket-id",
      s3BucketProps: { removalPolicy: cdk.RemovalPolicy.DESTROY },
    });
    this.apacheAirflowEfs = new blueprints.CreateEfsFileSystemProvider({
      name: "blueprints-apache-airflow-efs",
    });
    this.nodeClassSpec = {
      amiFamily: "AL2",
      subnetSelectorTerms: [
        { tags: { Name: `${blueprintID}/${blueprintID}-vpc/PrivateSubnet*` } },
      ],
      securityGroupSelectorTerms: [
        { tags: { "aws:eks:cluster-name": `${blueprintID}` } },
      ],
    };

    this.nodePoolSpec = {
      labels: {
        type: "karpenter-test",
      },
      annotations: {
        "eks-blueprints/owner": "young",
      },
      taints: [
        {
          key: "workload",
          value: "test",
          effect: "NoSchedule",
        },
      ],
      requirements: [
        {
          key: "node.kubernetes.io/instance-type",
          operator: "In",
          values: ["m5.2xlarge"],
        },
        {
          key: "topology.kubernetes.io/zone",
          operator: "In",
          values: [`${props?.env?.region}a`, `${props?.env?.region}b`],
        },
        {
          key: "kubernetes.io/arch",
          operator: "In",
          values: ["amd64", "arm64"],
        },
        { key: "karpenter.sh/capacity-type", operator: "In", values: ["spot"] },
      ],
      disruption: {
        consolidationPolicy: "WhenEmpty",
        consolidateAfter: "30s",
        expireAfter: "20m",
      },
    };

    this.addOns = [
      // pre-reqs / core addons
      new addons.VpcCniAddOn({
        customNetworkingConfig: {
          subnets: [
            blueprints.getNamedResource("secondary-cidr-subnet-0"),
            blueprints.getNamedResource("secondary-cidr-subnet-1"),
            blueprints.getNamedResource("secondary-cidr-subnet-2"),
          ],
        },
        awsVpcK8sCniCustomNetworkCfg: true,
        eniConfigLabelDef: "topology.kubernetes.io/zone",
        serviceAccountPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
        ],
      }),
      new addons.AwsLoadBalancerControllerAddOn(),
      new addons.CertManagerAddOn(),
      new addons.AdotCollectorAddOn({
        namespace: "adot",
        version: "auto",
      }),
      new addons.EfsCsiDriverAddOn({
        replicaCount: 1,
        kmsKeys: [
          blueprints.getResource(
            (context) =>
              new kms.Key(context.scope, "efs-csi-driver-key", {
                alias: "efs-csi-driver-key",
              })
          ),
        ],
      }),
      new addons.KarpenterAddOn({
        nodePoolSpec: this.nodePoolSpec,
        ec2NodeClassSpec: this.nodeClassSpec,
        interruptionHandling: true,
        installCRDs: false,
      }),

      // other addons
      new addons.AckAddOn({
        id: "s3-ack",
        createNamespace: true,
        skipVersionValidation: true,
        serviceName: blueprints.AckServiceName.S3,
      }),

      new addons.AmpAddOn({
        ampPrometheusEndpoint: this.ampWorkspace.attrPrometheusEndpoint,
        namespace: "adot",
      }),
      new addons.ApacheAirflowAddOn({
        enableLogging: true,
        s3Bucket: "apache-airflow-s3-bucket-provider",
        enableEfs: true,
        efsFileSystem: "apache-airflow-efs-provider",
      }),
      new addons.AppMeshAddOn(),
      new addons.ArgoCDAddOn(),
      new addons.AwsBatchAddOn(),
      new addons.AWSPrivateCAIssuerAddon(),
      new addons.AwsNodeTerminationHandlerAddOn(),
      new addons.CalicoOperatorAddOn(),
      new addons.CloudWatchLogsAddon({
        logGroupPrefix: "/aws/eks/blueprints-construct-dev",
        logRetentionDays: 30,
      }),
      new addons.CoreDnsAddOn(),
      new addons.EbsCsiDriverAddOn({
        version: "auto",
        kmsKeys: [
          blueprints.getResource(
            (context) =>
              new kms.Key(context.scope, "ebs-csi-driver-key", {
                alias: "ebs-csi-driver-key",
              })
          ),
        ],
        storageClass: "gp3",
      }),
      new addons.EksPodIdentityAgentAddOn(),
      new addons.EmrEksAddOn(),
      new addons.ExternalsSecretsAddOn(),
      new addons.FluxCDAddOn(),
      new addons.GpuOperatorAddon({
        values: {
          driver: {
            enabled: true,
          },
          mig: {
            strategy: "mixed",
          },
          devicePlugin: {
            enabled: true,
            version: "v0.13.0",
          },
          migManager: {
            enabled: true,
            WITH_REBOOT: true,
          },
          toolkit: {
            version: "v1.13.1-centos7",
          },
          operator: {
            defaultRuntime: "containerd",
          },
          gfd: {
            version: "v0.8.0",
          },
        },
      }),
      new addons.GrafanaOperatorAddon(),
      new addons.IngressNginxAddOn({
        serviceType: "ClusterIP",
      }),
      new addons.IstioBaseAddOn(),
      new addons.IstioControlPlaneAddOn(),
      new addons.IstioCniAddon(),
      new addons.IstioIngressGatewayAddon(),
      new addons.KedaAddOn({
        podSecurityContextFsGroup: 1001,
        securityContextRunAsGroup: 1001,
        securityContextRunAsUser: 1001,
        irsaRoles: ["CloudWatchFullAccess", "AmazonSQSFullAccess"],
      }),
      new addons.KubeProxyAddOn(),
      new addons.KubeRayAddOn(),
      new addons.KubeStateMetricsAddOn(),
      new addons.KubeviousAddOn(),
      new addons.MetricsServerAddOn(),
      new addons.NeuronDevicePluginAddOn(),
      new addons.NeuronMonitorAddOn(),
      new addons.NginxAddOn({
        values: {
          controller: { service: { create: false } },
        },
      }),
      new addons.OpaGatekeeperAddOn(),
      new addons.PrometheusNodeExporterAddOn(),
      new addons.S3CSIDriverAddOn({
        bucketNames: ["s3-csi-driver-for-blueprints-xbucket"],
      }),
      new addons.SecretsStoreAddOn(),
      new addons.SSMAgentAddOn(),
      new addons.UpboundCrossplaneAddOn({
        skipVersionValidation: true,
        clusterAccessRole: blueprints.getNamedResource("node-role"),
      }),
      new addons.XrayAddOn(),
      new addons.XrayAdotAddOn({
        namespace: "adot",
      }),
    ];

    // Instantiated to for helm version check.
    new blueprints.ExternalDnsAddOn({
      hostedZoneResources: [blueprints.GlobalResources.HostedZone],
    });

    this.clusterProvider = getClusterProvider([
      addGenericNodeGroup(),
      addCustomNodeGroup(),
      addWindowsNodeGroup(), //  commented out to check the impact on e2e
      addGpuNodeGroup(),
    ]);

    const executionRolePolicyStatement: iam.PolicyStatement[] = [
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["s3:*"],
      }),
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["glue:*"],
      }),
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["logs:*"],
      }),
    ];

    this.dataTeam = {
      name: "dataTeam",
      virtualClusterName: "batchJob",
      virtualClusterNamespace: "batchjob",
      createNamespace: true,
      executionRoles: [
        {
          executionRoleIamPolicyStatement: executionRolePolicyStatement,
          executionRoleName: "myBlueprintExecRole",
        },
      ],
    };

    this.batchTeam = {
      name: "batch-a",
      namespace: "aws-batch",
      envName: "batch-a-comp-env",
      computeResources: {
        envType: blueprints.BatchEnvType.EC2,
        allocationStrategy: blueprints.BatchAllocationStrategy.BEST,
        priority: 10,
        minvCpus: 0,
        maxvCpus: 128,
        instanceTypes: ["m5", "c4.4xlarge"],
      },
      jobQueueName: "team-a-job-queue",
    };
  }
}

export function getClusterProvider(managedNodeGroups: ManagedNodeGroup[]) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_30,
    tags: {
      Name: "blueprints-example-cluster",
      Type: "generic-cluster",
    },
    mastersRole: blueprints.getResource((context) => {
      return new iam.Role(context.scope, "AdminRole", {
        assumedBy: new iam.AccountRootPrincipal(),
      });
    }),
    managedNodeGroups: managedNodeGroups,
  });
}

export function addGenericNodeGroup(): blueprints.ManagedNodeGroup {
  return {
    id: "mng1",
    amiType: NodegroupAmiType.AL2_X86_64,
    instanceTypes: [new ec2.InstanceType("m5.4xlarge")],
    desiredSize: 2,
    maxSize: 3,
    nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    launchTemplate: {
      // You can pass Custom Tags to Launch Templates which gets Propogated to worker nodes.
      tags: {
        Name: "Mng1",
        Type: "Managed-Node-Group",
        LaunchTemplate: "Custom",
        Instance: "ONDEMAND",
      },
      requireImdsv2: false,
    },
  };
}

export function addCustomNodeGroup(): blueprints.ManagedNodeGroup {
  const userData = ec2.UserData.forLinux();
  userData.addCommands(`/etc/eks/bootstrap.sh ${blueprintID}`);

  return {
    id: "mng2-customami",
    amiType: NodegroupAmiType.AL2_X86_64,
    instanceTypes: [new ec2.InstanceType("t3.large")],
    nodeGroupCapacityType: CapacityType.SPOT,
    desiredSize: 0,
    minSize: 0,
    nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
    launchTemplate: {
      tags: {
        Name: "Mng2",
        Type: "Managed-Node-Group",
        LaunchTemplate: "Custom",
        Instance: "SPOT",
      },
      machineImage: ec2.MachineImage.genericLinux({
        "eu-west-1": "ami-00805477850d62b8c",
        "us-east-1": "ami-08e520f5673ee0894",
        "us-west-2": "ami-0403ff342ceb30967",
        "us-east-2": "ami-07109d69738d6e1ee",
        "us-west-1": "ami-07bda4b61dc470985",
        "us-gov-west-1": "ami-0e9ebbf0d3f263e9b",
        "us-gov-east-1": "ami-033eb9bc6daf8bfb1",
      }),
      userData: userData,
    },
  };
}

export function addWindowsNodeGroup(): blueprints.ManagedNodeGroup {
  return {
    id: "mng3-windowsami",
    amiType: NodegroupAmiType.WINDOWS_CORE_2019_X86_64,
    instanceTypes: [new ec2.InstanceType("m5.4xlarge")],
    desiredSize: 0,
    minSize: 0,
    nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
    diskSize: 50,
    tags: {
      Name: "Mng3",
      Type: "Managed-WindowsNode-Group",
      LaunchTemplate: "WindowsLT",
      "kubernetes.io/cluster/blueprint-construct-dev": "owned",
    },
  };
}

export function addGpuNodeGroup(): blueprints.ManagedNodeGroup {
  return {
    id: "mng-linux-gpu",
    amiType: NodegroupAmiType.AL2_X86_64_GPU,
    instanceTypes: [new ec2.InstanceType("g5.xlarge")],
    desiredSize: 0,
    minSize: 0,
    maxSize: 1,
    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    launchTemplate: {
      tags: {
        Name: "Mng-linux-Gpu",
        Type: "Managed-linux-Gpu-Node-Group",
        LaunchTemplate: "Linux-Launch-Template",
      },
      requireImdsv2: false,
    },
  };
}

export function addInferentiaNodeGroup(): blueprints.ManagedNodeGroup {
  return {
    id: "mng4-inferentia",
    instanceTypes: [new ec2.InstanceType("inf1.2xlarge")],
    desiredSize: 1,
    minSize: 1,
    nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
    diskSize: 50,
    tags: {
      Name: "Mng4",
      Type: "Managed-InferentiaNode-Group",
      LaunchTemplate: "Inferentia",
      "kubernetes.io/cluster/blueprint-construct-dev": "owned",
    },
  };
}
