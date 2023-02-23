import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from 'aws-cdk-lib/aws-kms';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { CapacityType, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { AccountRootPrincipal, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as blueprints from '../../lib';
import { logger } from '../../lib/utils';
import * as team from '../teams';

const burnhamManifestDir = './examples/teams/team-burnham/';
const rikerManifestDir = './examples/teams/team-riker/';
const teamManifestDirList = [burnhamManifestDir, rikerManifestDir];

export interface BlueprintConstructProps {
    /**
     * Id
     */
    id: string
}

export default class BlueprintConstruct {
    constructor(scope: Construct, props: cdk.StackProps) {

        blueprints.HelmAddOn.validateHelmVersions = true;
        blueprints.HelmAddOn.failOnVersionValidation = false;
        logger.settings.minLevel =  "debug";

        // TODO: fix IAM user provisioning for admin user
        // Setup platform team.
        //const account = props.env!.account!
        // const platformTeam = new team.TeamPlatform(account)
        // Teams for the cluster.
        const teams: Array<blueprints.Team> = [
            new team.TeamTroi,
            new team.TeamRiker(scope, teamManifestDirList[1]),
            new team.TeamBurnham(scope, teamManifestDirList[0]),
            new team.TeamPlatform(process.env.CDK_DEFAULT_ACCOUNT!)
        ];
        const prodBootstrapArgo = new blueprints.addons.ArgoCDAddOn({
            // TODO: enabling this cause stack deletion failure, known issue:
            // https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/argo-cd.md#known-issues
            // bootstrapRepo: {
            //      repoUrl: 'https://github.com/aws-samples/eks-blueprints-workloads.git',
            //      path: 'envs/dev',
            //      targetRevision: "deployable",
            //      credentialsSecretName: 'github-ssh',
            //      credentialsType: 'SSH'
            // },
            // adminPasswordSecretName: "argo-admin-secret"
        });
        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.AppMeshAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn(),
            new blueprints.addons.AdotCollectorAddOn(),
            new blueprints.addons.AmpAddOn(),
            new blueprints.addons.XrayAdotAddOn(),
            // new blueprints.addons.CloudWatchAdotAddOn(),
            new blueprints.addons.IstioBaseAddOn(),
            new blueprints.addons.IstioControlPlaneAddOn(),
            new blueprints.addons.CalicoOperatorAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.SecretsStoreAddOn(),
            prodBootstrapArgo,
            new blueprints.addons.SSMAgentAddOn(),
            new blueprints.addons.NginxAddOn({
                values: {
                    controller: { service: { create: false } }
                }
            }),
            new blueprints.addons.VeleroAddOn(),
            new blueprints.addons.VpcCniAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.OpaGatekeeperAddOn(),
            new blueprints.addons.AckAddOn({
                id: "s3-ack",
                createNamespace: true,
                skipVersionValidation: true,
                serviceName: blueprints.AckServiceName.S3
            }),
            // new blueprints.addons.AckAddOn({
            //     skipVersionValidation: true,
            //     id: "ec2-ack",
            //     createNamespace: false,
            //     serviceName: AckServiceName.EC2
            // }),
            // new blueprints.addons.AckAddOn({
            //     skipVersionValidation: true,
            //     serviceName: AckServiceName.RDS,
            //     id: "rds-ack",
            //     name: "rds-chart",
            //     chart: "rds-chart",
            //     version: "v0.1.1",
            //     release: "rds-chart",
            //     repository: "oci://public.ecr.aws/aws-controllers-k8s/rds-chart",
            //     managedPolicyName: "AmazonRDSFullAccess",
            //     createNamespace: false,
            //     saName: "rds-chart"
            // }),
            new blueprints.addons.KarpenterAddOn({
                requirements: [
                    { key: 'node.kubernetes.io/instance-type', op: 'In', vals: ['m5.2xlarge'] },
                    { key: 'topology.kubernetes.io/zone', op: 'NotIn', vals: ['us-west-2c']},
                    { key: 'kubernetes.io/arch', op: 'In', vals: ['amd64','arm64']},
                    { key: 'karpenter.sh/capacity-type', op: 'In', vals: ['spot']},
                ],
                subnetTags: {
                    "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
                },
                securityGroupTags: {
                    "kubernetes.io/cluster/blueprint-construct-dev": "owned",
                },
                taints: [{
                    key: "workload",
                    value: "test",
                    effect: "NoSchedule",
                }],
                consolidation: { enabled: true },
                ttlSecondsUntilExpired: 2592000,
                weight: 20,
                interruptionHandling: true,
                limits: {
                    resources: {
                        cpu: 20,
                        memory: "64Gi",
                    }
                }
            }),
            new blueprints.addons.AwsNodeTerminationHandlerAddOn(),
            new blueprints.addons.KubeviousAddOn(),
            new blueprints.addons.EbsCsiDriverAddOn({
                kmsKeys: [
                  blueprints.getResource( context => new kms.Key(context.scope, "ebs-csi-driver-key", { alias: "ebs-csi-driver-key"})),
                ],
              }
            ),
            new blueprints.addons.EfsCsiDriverAddOn({replicaCount: 1}),
            new blueprints.addons.KedaAddOn({
                podSecurityContextFsGroup: 1001,
                securityContextRunAsGroup: 1001,
                securityContextRunAsUser: 1001,
                irsaRoles: ["CloudWatchFullAccess", "AmazonSQSFullAccess"]
            }),
            new blueprints.addons.AWSPrivateCAIssuerAddon(),
            new blueprints.addons.JupyterHubAddOn({
                efsConfig: {
                    pvcName: "efs-persist",
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                    capacity: '10Gi',
                },
                enableIngress: false,
                notebookStack: 'jupyter/datascience-notebook',
                values: { prePuller: { hook: { enabled: false }}}
            }),
            new blueprints.EmrEksAddOn()
        ];

        // Instantiated to for helm version check.
        new blueprints.ExternalDnsAddOn({
            hostedZoneResources: [ blueprints.GlobalResources.HostedZone ]
        });
        new blueprints.ExternalsSecretsAddOn();
       
        const blueprintID = 'blueprint-construct-dev';

        const userData = ec2.UserData.forLinux();
        userData.addCommands(`/etc/eks/bootstrap.sh ${blueprintID}`); 

        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_23,
            mastersRole: blueprints.getResource(context => {
                return new Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
            }),
            managedNodeGroups: [
                {
                    id: "mng1",
                    amiType: NodegroupAmiType.AL2_X86_64,
                    instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
                    diskSize: 25,
                    desiredSize: 2,
                    maxSize: 3, 
                    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
                },
                {
                    id: "mng2-customami",
                    instanceTypes: [new ec2.InstanceType('t3.large')],
                    nodeGroupCapacityType: CapacityType.SPOT,
                    desiredSize: 0,
                    minSize: 0,
                    customAmi: {
                        machineImage: ec2.MachineImage.genericLinux({
                            'us-east-1': 'ami-08e520f5673ee0894',
                            'us-west-2': 'ami-0403ff342ceb30967',
                            'us-east-2': 'ami-07109d69738d6e1ee',
                            'us-west-1': 'ami-07bda4b61dc470985',
                            'us-gov-west-1': 'ami-0e9ebbf0d3f263e9b',
                            'us-gov-east-1':'ami-033eb9bc6daf8bfb1'
                        }),
                        userData: userData,
                    }
                }
            ]
        });

        const executionRolePolicyStatement: PolicyStatement [] = [
            new PolicyStatement({
              resources: ['*'],
              actions: ['s3:*'],
            }),
            new PolicyStatement({
              resources: ['*'],   
              actions: ['glue:*'],
            }),
            new PolicyStatement({
              resources: ['*'],
              actions: [
                'logs:*',
              ],
            }),
          ];
      
      const dataTeam: blueprints.EmrEksTeamProps = {
              name:'dataTeam',
              virtualClusterName: 'batchJob',
              virtualClusterNamespace: 'batchjob',
              createNamespace: true,
              executionRoles: [
                  {
                      executionRoleIamPolicyStatement: executionRolePolicyStatement,
                      executionRoleName: 'myBlueprintExecRole'
                  }
              ]
          };

        blueprints.EksBlueprint.builder()
            .addOns(...addOns)
            .clusterProvider(clusterProvider)
            .resourceProvider(blueprints.GlobalResources.Vpc, {
                provide(context: blueprints.ResourceContext) : IVpc {
                    return new ec2.Vpc(context.scope, "my-vpc");
                }
            })
            .teams(...teams, new blueprints.EmrEksTeam(dataTeam))
            .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
            .build(scope, blueprintID, props);
    }
}