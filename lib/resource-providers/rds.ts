import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {IVpc} from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import {GlobalResources, ResourceContext, ResourceProvider} from "../spi";


export interface RdsInstanceProps {
  readonly name?: string;
  readonly rdsProps?: Omit<rds.DatabaseInstanceProps, "vpc" | "vpcSubnets">;
}

export class RdsInstanceProvider
  implements ResourceProvider<rds.DatabaseInstance> {
  readonly options: RdsInstanceProps;

  constructor(options: RdsInstanceProps) {
    this.options = options;
  }

  provide(context: ResourceContext): rds.DatabaseInstance {
    const id = context.scope.node.id;

    const rdsVpc = context.get(GlobalResources.Vpc) as IVpc ?? new ec2.Vpc(
        context.scope,
        `${this.options.name}-${id}-Vpc`
    );

    const instanceProps: rds.DatabaseInstanceProps = {
      ...this.options.rdsProps,
      vpc: rdsVpc,
      removalPolicy: RemovalPolicy.RETAIN,
      deletionProtection: true,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }
    } as rds.DatabaseInstanceProps;

    let rdsInstance: rds.DatabaseInstance = new rds.DatabaseInstance(
      context.scope,
      this.options.name || `${id}-RDSInstance`,
      instanceProps
    );

    new CfnOutput(context.scope, "RDSInstanceId", {
      value: rdsInstance.instanceIdentifier
    });

    new CfnOutput(context.scope, "AuroraSecretIdentifier", {
      value: rdsInstance.secret!.secretArn
    });

    return rdsInstance;
  }
}

export interface AuroraClusterProps {
  readonly name?: string;
  readonly clusterProps?: Omit<rds.DatabaseClusterProps, "instanceProps">
  readonly instanceProps?: Omit<rds.InstanceProps, "vpc" | "vpcSubnets" | "securityGroups">;
}

export class AuroraClusterProvider
  implements ResourceProvider<rds.DatabaseCluster> {
  readonly options: AuroraClusterProps;

  constructor(options: AuroraClusterProps) {
    this.options = options;
  }

  provide(context: ResourceContext): rds.DatabaseCluster {
    const id = context.scope.node.id;

    const instanceProps: rds.InstanceProps = {
      ...this.options.instanceProps,
      vpc: context.get(GlobalResources.Vpc) as IVpc ?? new ec2.Vpc(
        context.scope,
        `${this.options.name}-${id}-Vpc`
      ),
    };

    const clusterProps: rds.DatabaseClusterProps = {
      ...this.options.clusterProps, instanceProps,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN
    } as rds.DatabaseClusterProps;

    let auroraInstance = new rds.DatabaseCluster(
      context.scope,
      this.options.name || `${id}-AuroraInstance`,
      clusterProps
    );

    new CfnOutput(context.scope, "AuroraInstanceId", {
      value: auroraInstance.clusterIdentifier
    });

    new CfnOutput(context.scope, "AuroraSecretIdentifier", {
      value: auroraInstance.secret!.secretArn
    });

    return auroraInstance;
  }
}