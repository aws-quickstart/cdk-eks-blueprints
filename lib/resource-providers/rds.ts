import { CfnOutput } from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import { GlobalResources, ResourceContext, ResourceProvider } from "../spi";
import {IClusterEngine, IDatabaseCluster, InstanceProps} from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {IVpc} from "aws-cdk-lib/aws-ec2";


export interface RdsInstanceProps {
  readonly name?: string;
  readonly rdsProps?: Omit<rds.DatabaseInstanceProps, "storageEncryptionKey">;
  readonly rdsEncryptionKeyResourceName?: string;
}

export interface AuroraClusterProps {
  readonly name?: string;
  readonly clusterProps?: Omit<rds.DatabaseClusterProps, "engine" | "instanceProps">
  readonly instanceProps?: InstanceProps;
  readonly auroraEngine: IClusterEngine;
}

export class AuroraClusterProvider
  implements ResourceProvider<rds.IDatabaseCluster> {
  readonly options: AuroraClusterProps;

  constructor(options: AuroraClusterProps) {
    this.options = options;
  }

  provide(context: ResourceContext): IDatabaseCluster {
    const id = context.scope.node.id;

    const instanceProps: InstanceProps = this.options.instanceProps ?? {
      vpc: context.get(GlobalResources.Vpc) as IVpc ?? new ec2.Vpc(
        context.scope,
        `${this.options.name}-${id}-Vpc`
      ),
    };

    let auroraInstance = new rds.DatabaseCluster(
      context.scope,
      this.options.name || `${id}-AuroraInstance`,
      {
        engine: this.options.auroraEngine,
        instanceProps: instanceProps
      }
    );

    new CfnOutput(context.scope, "AuroraInstanceId", {
      value: auroraInstance.clusterIdentifier
    });

    return auroraInstance;
  }
}