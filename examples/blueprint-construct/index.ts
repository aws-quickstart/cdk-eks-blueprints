import * as ec2 from "aws-cdk-lib/aws-ec2";
import { InstanceType } from 'aws-cdk-lib/aws-ec2';
import { CapacityType, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";

import * as blueprints from '../../lib';
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

export default class BlueprintConstruct extends Construct {
    constructor(scope: Construct, blueprintProps: BlueprintConstructProps, props: cdk.StackProps) {
        super(scope, blueprintProps.id);

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
            new blueprints.addons.CalicoAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.ContainerInsightsAddOn(),
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
            // ssp.addons.OpaGatekeeperAddOn(),
            new blueprints.addons.KarpenterAddOn(),
            new blueprints.addons.KubeviousAddOn(),
            new blueprints.addons.EbsCsiDriverAddOn(),
            new blueprints.addons.EfsCsiDriverAddOn({replicaCount: 1}),
        ];

        const blueprintID = `${blueprintProps.id}-dev`;

        const userData = ec2.UserData.forLinux();
        userData.addCommands(`/etc/eks/bootstrap.sh ${blueprintID}`);

        const clusterProvider = new blueprints.GenericClusterProvider({
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
                            'us-east-2': 'ami-093d9796e55a5b860',
                            'us-gov-west-1': 'ami-0e9ebbf0d3f263e9b',
                            'us-gov-east-1':'ami-033eb9bc6daf8bfb1'
                        }),
                        userData: userData,
                    }
                }
            ]
        });

        blueprints.EksBlueprint.builder()
            .addOns(...addOns)
            .clusterProvider(clusterProvider)
            .teams(...teams)
            .enableControlPlaneLogTypes('api')
            .build(scope, blueprintID, props);
    }
}