import {CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {IVpc} from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import {GlobalResources, ResourceContext, ResourceProvider} from "../spi";

export interface CreateRDSInstanceProviderProps {
  readonly name?: string;
  readonly rdsProps?: Omit<rds.DatabaseInstanceProps, "vpc"| "vpcSubnets" | "databaseName" | "removalPolicy">;
}

export class CreateRDSProvider implements ResourceProvider<rds.IDatabaseInstance> {
  readonly options: CreateRDSInstanceProviderProps;

  /**
   * Constructs a new RDS Provider.
   *
   * @param {CreateRDSInstanceProviderProps} options - The options for creating the RDS Provider.
   */

  constructor(options: CreateRDSInstanceProviderProps) {
    this.options = options;
  }

  provide(context: ResourceContext): rds.IDatabaseInstance {
    const id = context.scope.node.id;

    const rdsVpc = context.get(GlobalResources.Vpc) as IVpc ?? new ec2.Vpc(
        context.scope,
        `${this.options.name}-${id}-Vpc`
    );

    const instanceProps: rds.DatabaseInstanceProps = {
      ...this.options.rdsProps,
      vpc: rdsVpc,
      removalPolicy: RemovalPolicy.SNAPSHOT,
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

    new CfnOutput(context.scope, "RDSSecretIdentifier", {
      value: rdsInstance.secret!.secretArn
    });

    return rdsInstance;
  }
}

export interface CreateAuroraClusterProviderProps {
  readonly name?: string;
  readonly clusterEngine: rds.IClusterEngine;
  readonly clusterProps?: Omit<rds.DatabaseClusterProps, "engine" | "vpc" | "vpcSubnets">
}

export class CreateAuroraClusterProvider implements ResourceProvider<rds.IDatabaseCluster> {
  readonly options: CreateAuroraClusterProviderProps;

  /**
   * Constructor for the CreateAuroraClusterProvider class.
   *
   * @param {CreateAuroraClusterProviderProps} options - The options for creating an Aurora cluster provider.
   */
  constructor(options: CreateAuroraClusterProviderProps) {
    this.options = options;
  }

  provide(context: ResourceContext): rds.IDatabaseCluster {
    const id = context.scope.node.id;

    const auroraVpc = context.get(GlobalResources.Vpc) as IVpc ?? new ec2.Vpc(
        context.scope,
        `${this.options.name}-${id}-Vpc`
    );

    const clusterProps: rds.DatabaseClusterProps = {
      ...this.options.clusterProps,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      deletionProtection: true,
      vpc: auroraVpc,
    } as rds.DatabaseClusterProps;

    let auroraInstance = new rds.DatabaseCluster(
        context.scope,
        this.options.name || `${id}-AuroraCluster`,
        clusterProps
    );

    new CfnOutput(context.scope, "AuroraClusterId", {
      value: auroraInstance.clusterIdentifier
    });

    new CfnOutput(context.scope, "AuroraSecretIdentifier", {
      value: auroraInstance.secret!.secretArn
    });

    return auroraInstance;
  }

}
