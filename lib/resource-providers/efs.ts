import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as cdk from 'aws-cdk-lib/core';
import { GlobalResources, ResourceContext, ResourceProvider } from "../spi";

/**
 * EFS resource provider 
   * Pass either an EFS file system name to lookup an existing or create a new one.
   * @param name The name of the EFS file system to lookup an existing EFS file system in the deployment target, if omitted a file system will be created.
   * @param removalPolicy The removal policy to use for the EFS file system
   * @param efsProps The key props used
 */
export class EfsFileSystemProvider implements ResourceProvider<efs.IFileSystem> {
    readonly name?: string;
    readonly efsProps?: efs.FileSystemProps;
    readonly removalPolicy?: cdk.RemovalPolicy;

    constructor(name?: string, efsProps?: efs.FileSystemProps, removalPolicy?: cdk.RemovalPolicy) {
        this.name = name;
        this.efsProps = efsProps;
        this.removalPolicy = removalPolicy;
    }

    provide(context: ResourceContext): efs.IFileSystem {
        const id = context.scope.node.id;
        const securityGroupId = `${id}-${this.name}-EfsSecurityGroup` || `${id}-EfsSecurityGroup`;
        let efsFileSystem = undefined;

        if (this.name) {
            const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
                context.scope,
                securityGroupId,
                securityGroupId,
            );
            efsFileSystem = efs.FileSystem.fromFileSystemAttributes(
                context.scope, this.name,
                {
                    securityGroup: securityGroup,
                }
            );
        }

        if (!efsFileSystem) {
            const vpc = context.get(GlobalResources.Vpc) as ec2.IVpc;
            const removalPolicy = this.removalPolicy || context.removalPolicy;
            const clusterVpcCidr = vpc.vpcCidrBlock;
            if (!vpc) {
                throw new Error('VPC not found in context');
            }

            const efsSG = new ec2.SecurityGroup(
                context.scope, securityGroupId,
                {
                    vpc: vpc,
                    securityGroupName: securityGroupId,
                }
            );
            efsSG.addIngressRule(
                ec2.Peer.ipv4(clusterVpcCidr),
                new ec2.Port({
                    protocol: ec2.Protocol.TCP,
                    stringRepresentation: "EFSconnection",
                    toPort: 2049,
                    fromPort: 2049,
                }),
            );

            efsFileSystem = new efs.FileSystem(
                context.scope, this.name || `${id}-EfsFileSystem`,
                {
                    vpc: vpc,
                    securityGroup: efsSG,
                    removalPolicy: removalPolicy,
                    encrypted: true,
                    ...this.efsProps,
                }
            );
        }
        return efsFileSystem;
    }
}
