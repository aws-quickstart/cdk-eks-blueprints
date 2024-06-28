import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { CapacityType, KubernetesVersion, NodegroupAmiType, IpFamily } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as blueprints from '../../lib';
import { logger, userLog } from '../../lib/utils';
import * as team from '../teams';

const burnhamManifestDir = './examples/teams/team-burnham/';
const rikerManifestDir = './examples/teams/team-riker/';
const teamManifestDirList = [burnhamManifestDir, rikerManifestDir];
const blueprintID = 'blueprint-ipv6-construct-dev';

export interface BlueprintIPv6ConstructProps {
    /**
     * Id
     */
    id: string
}

/*
** This class is modification of ../blueprint-contruct/index.ts
** To have IPv6 configurations, BlueprintConstruct has been replicated and updated to BlueprintIPV6Construct.
 */
export default class BlueprintIPV6Construct {
    constructor(scope: Construct, props: cdk.StackProps) {

        blueprints.HelmAddOn.validateHelmVersions = true;
        blueprints.HelmAddOn.failOnVersionValidation = false;
        logger.settings.minLevel = 3; // info
        userLog.settings.minLevel = 2; // debug

        const teams: Array<blueprints.Team> = [
            new team.TeamTroi,
            new team.TeamRiker(scope, teamManifestDirList[1]),
            new team.TeamBurnham(scope, teamManifestDirList[0]),
            new team.TeamPlatform(process.env.CDK_DEFAULT_ACCOUNT!)
        ];

        const nodeRole = new blueprints.CreateIPv6NodeRoleProvider("blueprint-node-role", new iam.ServicePrincipal("ec2.amazonaws.com"),
            [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
            ]);

        const nodeClassSpec: blueprints.Ec2NodeClassSpec = {
            amiFamily: "AL2",
            subnetSelectorTerms: [{ tags: { "Name": `${blueprintID}/${blueprintID}/${blueprintID}-vpc/PrivateSubnet*` }}],
            securityGroupSelectorTerms: [{ tags: { "aws:eks:cluster-name": `${blueprintID}` }}],
        };

        const nodePoolSpec: blueprints.NodePoolSpec = {
            labels: {
                type: "karpenter-test"
            },
            annotations: {
                "eks-blueprints/owner": "bugatha"
            },
            requirements: [
                { key: 'node.kubernetes.io/instance-type', operator: 'In', values: ["c5.large", "m5.large", "r5.large", "m5.xlarge"] },
                { key: 'topology.kubernetes.io/zone', operator: 'In', values: [`${props?.env?.region}a`,`${props?.env?.region}b`]},
                { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64','arm64']},
                { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['on-demand']},
            ],
            disruption: {
                consolidationPolicy: "WhenEmpty",
                consolidateAfter: "30s",
                expireAfter: "20m",
            }
        };

        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.KarpenterAddOn({
                version: "v0.34.5",
                nodePoolSpec: nodePoolSpec,
                ec2NodeClassSpec: nodeClassSpec,
                interruptionHandling: true,
            }),
            new blueprints.addons.SecretsStoreAddOn(),
        ];

        // Instantiated to for helm version check.
        new blueprints.ExternalDnsAddOn({
            hostedZoneResources: [ blueprints.GlobalResources.HostedZone ]
        });

        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_29,
            tags: {
                "Name": "blueprints-example-cluster",
                "Type": "generic-cluster"
            },
            mastersRole: blueprints.getResource(context => {
                return new iam.Role(context.scope, 'AdminRole', { assumedBy: new iam.AccountRootPrincipal() });
            }),
            managedNodeGroups: [
                addGenericNodeGroup(),
                addCustomNodeGroup(),
                addWindowsNodeGroup(), //  commented out to check the impact on e2e
                addGpuNodeGroup()
            ]
        });

        blueprints.EksBlueprint.builder()
            .addOns(...addOns)
            .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(undefined))
            .resourceProvider("node-role", nodeRole)
            .withBlueprintProps({
                ipFamily: IpFamily.IP_V6,
            })
            .clusterProvider(clusterProvider)
            .teams(...teams)
            .build(scope, blueprintID, props);

    }
}

function addGenericNodeGroup(): blueprints.ManagedNodeGroup {

    return {
        id: "mng1",
        amiType: NodegroupAmiType.AL2_X86_64,
        instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
        desiredSize: 2,
        maxSize: 3,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        launchTemplate: {
            // You can pass Custom Tags to Launch Templates which gets Propogated to worker nodes.
            tags: {
                "Name": "Mng1",
                "Type": "Managed-Node-Group",
                "LaunchTemplate": "Custom",
                "Instance": "ONDEMAND"
            },
            requireImdsv2: false
        }
    };
}

function addCustomNodeGroup(): blueprints.ManagedNodeGroup {

    const userData = ec2.UserData.forLinux();
    userData.addCommands(`/etc/eks/bootstrap.sh ${blueprintID}`);

    return {
        id: "mng2-customami",
        amiType: NodegroupAmiType.AL2_X86_64,
        instanceTypes: [new ec2.InstanceType('t3.large')],
        nodeGroupCapacityType: CapacityType.SPOT,
        desiredSize: 0,
        minSize: 0,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        launchTemplate: {
            tags: {
                "Name": "Mng2",
                "Type": "Managed-Node-Group",
                "LaunchTemplate": "Custom",
                "Instance": "SPOT"
            },
            machineImage: ec2.MachineImage.genericLinux({
                'eu-west-1': 'ami-00805477850d62b8c',
                'us-east-1': 'ami-08e520f5673ee0894',
                'us-west-2': 'ami-0403ff342ceb30967',
                'us-east-2': 'ami-07109d69738d6e1ee',
                'us-west-1': 'ami-07bda4b61dc470985',
                'us-gov-west-1': 'ami-0e9ebbf0d3f263e9b',
                'us-gov-east-1':'ami-033eb9bc6daf8bfb1'
            }),
            userData: userData,
        }
    };
}

function addWindowsNodeGroup(): blueprints.ManagedNodeGroup {

    return {
        id: "mng3-windowsami",
        amiType: NodegroupAmiType.WINDOWS_CORE_2019_X86_64,
        instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
        desiredSize: 0,
        minSize: 0,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        diskSize: 50,
        tags: {
            "Name": "Mng3",
            "Type": "Managed-WindowsNode-Group",
            "LaunchTemplate": "WindowsLT",
            "kubernetes.io/cluster/blueprint-ipv6-construct-dev": "owned"
        }
    };
}

function addGpuNodeGroup(): blueprints.ManagedNodeGroup {

    return {
        id: "mng-linux-gpu",
        amiType: NodegroupAmiType.AL2_X86_64_GPU,
        instanceTypes: [new ec2.InstanceType('g5.xlarge')],
        desiredSize: 0,
        minSize: 0,
        maxSize: 1,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        launchTemplate: {
            tags: {
                "Name": "Mng-linux-Gpu",
                "Type": "Managed-linux-Gpu-Node-Group",
                "LaunchTemplate": "Linux-Launch-Template",
            },
            requireImdsv2: false
        }
    };
}

export function addInferentiaNodeGroup(): blueprints.ManagedNodeGroup {

    return {
        id: "mng4-inferentia",
        instanceTypes: [new ec2.InstanceType('inf1.2xlarge')],
        desiredSize: 1,
        minSize: 1,
        nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
        diskSize: 50,
        tags: {
            "Name": "Mng4",
            "Type": "Managed-InferentiaNode-Group",
            "LaunchTemplate": "Inferentia",
            "kubernetes.io/cluster/blueprint-ipv6-construct-dev": "owned"
        }
    };
}
