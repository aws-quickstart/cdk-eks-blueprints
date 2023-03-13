import { CfnOutput } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import * as kms from "aws-cdk-lib/aws-kms";
import { GlobalResources, ResourceContext, ResourceProvider } from "../spi";

export interface CreateEfsFileSystemProps {
  readonly name?: string;
  readonly efsProps?: Omit<efs.FileSystemProps, "vpc" | "kmsKey">;
  readonly kmsKeyResourceName?: string;
}

export interface LookupEfsFileSystemProps {
  readonly name: string;
  readonly fileSystemId: string;
}

/**
 * EFS resource provider.
 *
 * @param name The name of the EFS file system to create.
 * @param efsProps The props used for the file system.
 */
export class CreateEfsFileSystemProvider
  implements ResourceProvider<efs.IFileSystem>
{
  readonly options: CreateEfsFileSystemProps;

  constructor(options: CreateEfsFileSystemProps) {
    this.options = options;
  }

  provide(context: ResourceContext): efs.IFileSystem {
    const id = context.scope.node.id;
    const securityGroupId = `${id}-${
      this.options.name ?? "default"
    }-EfsSecurityGroup`;
    let efsFileSystem: efs.IFileSystem | undefined;
    const vpc = context.get(GlobalResources.Vpc) as ec2.IVpc;
    if (vpc === undefined) {
      throw new Error("VPC not found in context");
    }
    const clusterVpcCidr = vpc.vpcCidrBlock;
    let kmsKey: kms.IKey | undefined;
    if (this.options.kmsKeyResourceName) {
      kmsKey = context.get(this.options.kmsKeyResourceName) as kms.IKey;
    }

    const efsSG = new ec2.SecurityGroup(context.scope, securityGroupId, {
      vpc,
      securityGroupName: securityGroupId,
    });
    efsSG.addIngressRule(
      ec2.Peer.ipv4(clusterVpcCidr),
      new ec2.Port({
        protocol: ec2.Protocol.TCP,
        stringRepresentation: "EFSconnection",
        toPort: 2049,
        fromPort: 2049,
      })
    );

    efsFileSystem = new efs.FileSystem(
      context.scope,
      this.options.name || `${id}-EfsFileSystem`,
      {
        vpc,
        securityGroup: efsSG,
        kmsKey,
        ...this.options.efsProps,
      }
    );
    new CfnOutput(context.scope, "EfsFileSystemId", {
      value: efsFileSystem.fileSystemId,
    });
    return efsFileSystem;
  }
}

/**
 * Pass an EFS file system name and id to lookup an existing EFS file system.
 * @param name The name of the EFS file system to lookup an existing EFS file system.
 * @param fileSystemId The id of the EFS file system to lookup an existing EFS file system.
 */
export class LookupEfsFileSystemProvider
  implements ResourceProvider<efs.IFileSystem>
{
  readonly options: LookupEfsFileSystemProps;

  constructor(options: LookupEfsFileSystemProps) {
    this.options = options;
  }

  provide(context: ResourceContext): efs.IFileSystem {
    const id = context.scope.node.id;
    const securityGroupId = `${id}-${
      this.options.name ?? "default"
    }-EfsSecurityGroup`;
    let efsFileSystem: efs.IFileSystem | undefined;

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      context.scope,
      securityGroupId,
      securityGroupId
    );
    efsFileSystem = efs.FileSystem.fromFileSystemAttributes(
      context.scope,
      this.options.name,
      {
        securityGroup: securityGroup,
        fileSystemId: this.options.fileSystemId,
      }
    );

    new CfnOutput(context.scope, "EfsFileSystemId", {
      value: efsFileSystem.fileSystemId,
    });
    return efsFileSystem;
  }
}
