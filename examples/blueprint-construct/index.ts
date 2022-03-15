import * as ec2 from "@aws-cdk/aws-ec2";
import { InstanceType } from '@aws-cdk/aws-ec2';
import { CapacityType, KubernetesVersion, NodegroupAmiType } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
// SSP lib.
import * as ssp from '../../lib';
import { EksBlueprint } from '../../lib';
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

export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, blueprintProps: BlueprintConstructProps, props: cdk.StackProps) {
        super(scope, blueprintProps.id);

        // TODO: fix IAM user provisioning for admin user
        // Setup platform team.
        //const account = props.env!.account!
        // const platformTeam = new team.TeamPlatform(account)

        // Teams for the cluster.
        const teams: Array<ssp.Team> = [
            new team.TeamTroi,
            new team.TeamRiker(scope, teamManifestDirList[1]),
            new team.TeamBurnham(scope, teamManifestDirList[0]),
            new team.TeamPlatform(process.env.CDK_DEFAULT_ACCOUNT!)
        ];
        const prodBootstrapArgo = new ssp.addons.ArgoCDAddOn({
            // TODO: enabling this cause stack deletion failure, known issue:
            // https://github.com/aws-quickstart/ssp-amazon-eks/blob/main/docs/addons/argo-cd.md#known-issues
            // bootstrapRepo: {
            //      repoUrl: 'https://github.com/aws-samples/ssp-eks-workloads.git',
            //      path: 'envs/dev',
            //      targetRevision: "deployable",
            //      credentialsSecretName: 'github-ssh',
            //      credentialsType: 'SSH'
            // },
            // adminPasswordSecretName: "argo-admin-secret"
        });
        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.addons.AppMeshAddOn(),
            new ssp.addons.CalicoAddOn(),
            new ssp.addons.MetricsServerAddOn(),
            new ssp.addons.ContainerInsightsAddOn(),
            new ssp.addons.AwsLoadBalancerControllerAddOn(),
            new ssp.addons.SecretsStoreAddOn(),
            prodBootstrapArgo,
            new ssp.addons.SSMAgentAddOn(),
            new ssp.addons.NginxAddOn({
                values: {
                    controller: { service: { create: false } }
                }
            }),
            new ssp.addons.VeleroAddOn(),
            new ssp.addons.VpcCniAddOn(),
            new ssp.addons.CoreDnsAddOn(),
            new ssp.addons.KubeProxyAddOn(),
            // new ssp.addons.OpaGatekeeperAddOn(),
            new ssp.addons.KarpenterAddOn(),
            new ssp.addons.KubeviousAddOn(),
            new ssp.addons.EbsCsiDriverAddOn()
        ];

        const blueprintID = `${blueprintProps.id}-dev`;

        const userData = ec2.UserData.forLinux();
        userData.addCommands(`/etc/eks/bootstrap.sh ${blueprintID}`);

        const clusterProvider = new ssp.GenericClusterProvider({
            version: KubernetesVersion.V1_21,
            managedNodeGroups: [
                {
                    id: "mng1",
                    amiType: NodegroupAmiType.AL2_X86_64,
                    instanceTypes: [new InstanceType('m5.2xlarge')]
                },
                {
                    id: "mng2-custom",
                    instanceTypes: [new InstanceType('m5.2xlarge')],
                    nodeGroupCapacityType: CapacityType.SPOT,
                    customAmi: {
                        machineImage: ec2.MachineImage.genericLinux({
                            'us-east-1': 'ami-0b297a512e2852b89',
                            'us-west-2': 'ami-06a8c459c01f55c7b',
                            'us-east-2': 'ami-093d9796e55a5b860'
                        }),
                        userData: userData,
                    }
                }
            ]
        });

        EksBlueprint.builder()
            .addOns(...addOns)
            .clusterProvider(clusterProvider)
            .teams(...teams)
            .enableControlPlaneLogTypes('api')
            .build(scope, blueprintID, props);
    }
}