import { App } from "aws-cdk-lib";
import * as blueprints from "../../lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {AuroraClusterProvider, RdsInstanceProvider} from "../../lib";
import {GlobalResources, VpcProvider} from "../../lib";
import {
  AuroraPostgresEngineVersion, Credentials,
  DatabaseClusterEngine,
  DatabaseInstanceEngine, MariaDbEngineVersion,
  MysqlEngineVersion, PostgresEngineVersion
} from "aws-cdk-lib/aws-rds";


describe("AuroraClusterProvider", () => {
  test("Stack created with AuroraProvider without VPC should create AuroraCluster", () => {
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.Rds,
        new AuroraClusterProvider({
          auroraEngine: DatabaseClusterEngine.auroraPostgres(
            { version: AuroraPostgresEngineVersion.VER_14_6 }
          ),
          name: "aurora-rp-test-no-vpc"
        })
      )
      .account("123456789")
      .region("us-east-1")
      .build(app, 'aurora-test-no-vpc');

    const template = Template.fromStack(stack);

    template.hasResource("AWS::RDS::DBCluster", {
      Properties: {
        Engine: Match.anyValue(),
        EngineVersion: Match.anyValue(),
        VpcSecurityGroupIds: Match.anyValue()
      }
    });
  });


  test("Stack created with AuroraProvider with VPC should also create AuroraCluster", () => {
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.Vpc,
        new VpcProvider(
          undefined,
          "10.0.0.0/16",
          [
            "10.0.1.0/24",
            "10.0.2.0/24",
            "10.0.3.0/24"
          ]
        )
      )
      .resourceProvider(
        GlobalResources.Rds,
        new AuroraClusterProvider({
          auroraEngine: DatabaseClusterEngine.auroraPostgres(
            { version: AuroraPostgresEngineVersion.VER_14_6 }
          ),
          name: "aurora-rp-test-w-vpc"
        })
      )
      .account("1234567889")
      .region("us-east-1")
      .build(app, 'aurora-test-w-vpc');

    const template = Template.fromStack(stack);

    template.hasResource("AWS::RDS::DBCluster", {
      Properties: {
        Engine: Match.anyValue(),
        EngineVersion: Match.anyValue(),
        VpcSecurityGroupIds: Match.anyValue()
      }
    });
  });

  test("Stack created with arbitrary user props passed to aurora should be honoured", () => {

  });
});

describe("RDSInstanceProvider", () => {
  test("Stack created with RDSProvider without VPC should create RDSInstance", () => {
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.Rds,
        new RdsInstanceProvider(
          {
            rdsProps: {
              credentials: Credentials.fromGeneratedSecret('admin'),
              engine: DatabaseInstanceEngine.mariaDb({
                version: MariaDbEngineVersion.VER_10_3
              })
            },
            name: "rds-rp-test-no-vpc"
          }
        )
      )
      .account("123456789")
      .region("us-east-1")
      .build(app, 'rds-test-no-vpc');

    const template = Template.fromStack(stack);

    template.hasResource("AWS::RDS::DBInstance", {
      Properties: {
        Engine: Match.anyValue(),
        EngineVersion: Match.anyValue(),
        VPCSecurityGroups: Match.anyValue()
      }
    });
  });


  test("Stack created with RDSProvider with VPC should also create RDS Instance", () => {
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.Vpc,
        new VpcProvider(
          undefined,
          "10.0.0.0/16",
          [
            "10.0.1.0/24",
            "10.0.2.0/24",
            "10.0.3.0/24"
          ]
        )
      )
      .resourceProvider(
        GlobalResources.Rds,
        new RdsInstanceProvider({
          rdsProps: {
            credentials: Credentials.fromGeneratedSecret('admin'),
            engine: DatabaseInstanceEngine.postgres({
              version: PostgresEngineVersion.VER_15_2
            })
          },
          name: 'rds-rp-test-w-vpc'
        })
      )
      .account("1234567889")
      .region("us-east-1")
      .build(app, 'rds-test-w-vpc');

    const template = Template.fromStack(stack);

    template.hasResource("AWS::RDS::DBInstance", {
      Properties: {
        Engine: Match.anyValue(),
        EngineVersion: Match.anyValue(),
        VPCSecurityGroups: Match.anyValue()
      }
    });
  });

  test("Stack created with arbitrary user props passed to aurora should be honoured", () => {
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.Vpc,
        new VpcProvider(
          undefined,
          "10.0.0.0/16",
          [
            "10.0.1.0/24",
            "10.0.2.0/24",
            "10.0.3.0/24"
          ]
        )
      )
      .resourceProvider(
        GlobalResources.Rds,
        new RdsInstanceProvider({
          rdsProps: {
            engine: DatabaseInstanceEngine.mysql({
              version: MysqlEngineVersion.VER_8_0
            }),
          },
          name: 'rds-rp-test-arbitrary-props'
        })
      )
      .account("1234567889")
      .region("us-east-1")
      .build(app, 'rds-test-arbitrary-props');

    const template = Template.fromStack(stack);

    template.hasResource("AWS::RDS::DBInstance", {
      Properties: {
        Engine: Match.exact("mysql"),
        EngineVersion: Match.exact("8.0"),
        VPCSecurityGroups: Match.anyValue()
      }
    });
  });
});