import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as cdk from 'aws-cdk-lib/core';
import { GlobalResources, ResourceContext, ResourceProvider } from "../spi";

/**
 * Configuration options for the EFS file system.
 */
export interface EfsFileSystemProps {
    readonly name?: string;
    readonly fileSystemId?: string;
    readonly efsProps?: Omit<efs.FileSystemProps, "vpc">;
    readonly removalPolicy?: cdk.RemovalPolicy;
}

/**
 * EFS resource provider.
 *
 * Pass either an EFS file system name and id to lookup an existing one, or create a new one.
 * @param name The name of the EFS file system to lookup an existing EFS file system in the deployment target. If omitted, a file system will be created.
 * @param fileSystemId The id of the EFS file system to lookup an existing EFS file system in the deployment target. If omitted, a file system will be created.
 * @param efsProps The props used for the file system.
 * @param removalPolicy The removal policy to use for the EFS file system.
 */
export class EfsFileSystemProvider implements ResourceProvider<efs.IFileSystem> {
    readonly options: EfsFileSystemProps;

    constructor(options: EfsFileSystemProps) {
        this.options = options;
    }

    provide(context: ResourceContext): efs.IFileSystem {
        const id = context.scope.node.id;
        const securityGroupId = `${id}-${this.options.name ?? 'default'}-EfsSecurityGroup`;
        let efsFileSystem: efs.IFileSystem | undefined;

        if (this.options.fileSystemId && this.options.name) {
            const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
                context.scope,
                securityGroupId,
                securityGroupId,
            );
            efsFileSystem = efs.FileSystem.fromFileSystemAttributes(
                context.scope, this.options.name,
                {
                    securityGroup: securityGroup,
                    fileSystemId: this.options.fileSystemId,
                }
            );
        }

        if (!efsFileSystem) {
            const vpc = context.get(GlobalResources.Vpc) as ec2.IVpc;

            if (vpc === undefined) {
                throw new Error('VPC not found in context');
            }
            const removalPolicy = this.options.removalPolicy ?? context.removalPolicy;
            const clusterVpcCidr = vpc.vpcCidrBlock;

            const efsSG = new ec2.SecurityGroup(context.scope, securityGroupId, { vpc, securityGroupName: securityGroupId, });
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
                context.scope, this.options.name || `${id}-EfsFileSystem`,
                {
                    vpc,
                    securityGroup: efsSG,
                    removalPolicy,
                    encrypted: true,
                    ...this.options.efsProps,
                }
            );
        }
        return efsFileSystem;
    }
}
