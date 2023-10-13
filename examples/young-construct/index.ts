import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { AccountRootPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from "constructs";
import * as blueprints from '../../lib'; 
import { logger, userLog } from '../../lib/utils';

export interface BlueprintConstructProps {
    /**
     * Id
     */
    id: string
}

export default class YoungConstruct {
    constructor(scope: Construct, props: cdk.StackProps) {

        blueprints.HelmAddOn.validateHelmVersions = true;
        blueprints.HelmAddOn.failOnVersionValidation = false;
        logger.settings.minLevel =  3;
        userLog.settings.minLevel = 2;

        const vpc = new blueprints.VpcProvider(undefined, {
            primaryCidr: "10.2.0.0/16", 
            secondaryCidr: "100.64.0.0/16",
            secondarySubnetCidrs: ["100.64.0.0/24","100.64.1.0/24","100.64.2.0/24"]
        });
        // const airflowEfs = new blueprints.CreateEfsFileSystemProvider({
        //     name: "airflow-efs-file-system"
        // });       
        const apacheAirflowS3Bucket = new blueprints.CreateS3BucketProvider({
            id: 'apache-airflow-s3-bucket-id',
            s3BucketProps: { removalPolicy: cdk.RemovalPolicy.DESTROY }
        });
        
        const teams: Array<blueprints.Team> = [];
        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.SSMAgentAddOn(),
            // new blueprints.addons.KarpenterAddOn({
            //     requirements: [
            //         { key: 'node.kubernetes.io/instance-type', op: 'In', vals: ['m5.2xlarge'] },
            //         { key: 'topology.kubernetes.io/zone', op: 'NotIn', vals: ['us-west-2c']},
            //         { key: 'kubernetes.io/arch', op: 'In', vals: ['amd64','arm64']},
            //         { key: 'karpenter.sh/capacity-type', op: 'In', vals: ['spot']},
            //     ],
            //     subnetTags: {
            //         "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
            //     },
            //     securityGroupTags: {
            //         "kubernetes.io/cluster/blueprint-construct-dev": "owned",
            //     },
            //     taints: [{
            //         key: "workload",
            //         value: "test",
            //         effect: "NoSchedule",
            //     }],
            //     consolidation: { enabled: true },
            //     ttlSecondsUntilExpired: 2592000,
            //     weight: 20,
            //     interruptionHandling: true,
            //     limits: {
            //         resources: {
            //             cpu: 20,
            //             memory: "64Gi",
            //         }
            //     },
            // }),
            new blueprints.addons.EfsCsiDriverAddOn({replicaCount: 1}),
            new blueprints.addons.EbsCsiDriverAddOn(),
            // new blueprints.addons.JupyterHubAddOn({
            //     efsConfig: {
            //         pvcName: "efs-persist",
            //         removalPolicy: cdk.RemovalPolicy.DESTROY,
            //         capacity: '10Gi',
            //     },
            //     serviceType: blueprints.JupyterHubServiceType.CLUSTERIP,
            //     notebookStack: 'jupyter/datascience-notebook',
            //     values: { prePuller: { hook: { enabled: false }}}
            // }),
            // new blueprints.AwsBatchAddOn(),
            new blueprints.AwsForFluentBitAddOn(),
            // new blueprints.AirflowAddOn({
            //     enableLogging: true,
            //     s3BucketName: airflowS3bucket.name
            //     // enableRds: true,
            //     // dbConfig: {
            //     //     username: "airflow-user",
            //     //     password: "PA$$w0rd123",
            //     //     dbName: "airflow",
            //     // },
            //     // enableEfs: true,
            //     // efsFileSystemName: airflowEfs.options.name!,
            // }),
            new blueprints.ApacheAirflowAddOn({
                enableLogging: true,
                s3Bucket: 'airflow-logging-s3-bucket',
                // enableEfs: true,
                // efsFileSystem: 'apache-airflow-efs-provider',
            })
        ];

        const blueprintID = 'young-blueprint-test';

        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_25,
            mastersRole: blueprints.getResource(context => {
                return new Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
            }),
            managedNodeGroups: [
                {
                    id: "mng1",
                    amiType: NodegroupAmiType.AL2_X86_64,
                    // amiReleaseVersion: "",
                    instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
                    diskSize: 25,
                    desiredSize: 2,
                    maxSize: 3, 
                    nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
                }
            ]
        });

        // const batchTeam: blueprints.BatchEksTeamProps = {
        //     name: 'batch-a',
        //     namespace: 'aws-batch',
        //     envName: 'batch-a-comp-env',
        //     computeResources: {
        //         envType: blueprints.BatchEnvType.EC2,
        //         allocationStrategy: blueprints.BatchAllocationStrategy.BEST,
        //         priority: 10,
        //         minvCpus: 0,
        //         maxvCpus: 128,
        //         instanceTypes: ["m5", "c4.4xlarge"]
        //     },
        //     jobQueueName: 'team-a-job-queue',
        // };

        blueprints.EksBlueprint.builder()
            .resourceProvider(blueprints.GlobalResources.Vpc, vpc)
            .resourceProvider('airflow-logging-s3-bucket', apacheAirflowS3Bucket)
            // .resourceProvider('airflow-efs-file-system', airflowEfs)
            .addOns(...addOns)
            .clusterProvider(clusterProvider)
            .teams(...teams, 
                // new blueprints.BatchEksTeam(batchTeam)
            )
            // .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
            .build(scope, blueprintID, props);
    }
}