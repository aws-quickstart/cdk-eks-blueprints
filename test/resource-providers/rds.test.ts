import { App } from "aws-cdk-lib";
import * as blueprints from "../../lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { AuroraClusterProvider, AuroraClusterProps } from "../../lib/resource-providers/rds";
import {GlobalResources, VpcProvider} from "../../lib";
import {AuroraPostgresEngineVersion, DatabaseClusterEngine} from "aws-cdk-lib/aws-rds";


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
          name: "aurora-rp-test"
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
});