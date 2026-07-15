import * as bp from "../lib";
import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import {KubernetesVersion} from "aws-cdk-lib/aws-eks-v2";
import {Construct} from "constructs";
import {logger} from "../lib/utils";
import { Vpc } from "aws-cdk-lib/aws-ec2";

const app = new cdk.App();

class MyPrivateMetricAddOn implements bp.ClusterAddOn {
  metricProps: cloudwatch.MetricProps;

  constructor(metric: cloudwatch.MetricProps) {
    this.metricProps = metric;
  }

  deploy(_clusterInfo: bp.ClusterInfo): Promise<Construct> | void {
    const metric: cloudwatch.Metric = new cloudwatch.Metric(this.metricProps);
    logger.info(`"MyPrivateMetricAddOn: ${metric} successfully initialized"`);
  }
}

bp.EksBlueprint.builder()
  .account(process.env.CDK_DEFAULT_ACCOUNT)
  .region(process.env.CDK_DEFAULT_REGION)
  .version(KubernetesVersion.V1_32)
  .resourceProvider("vpc", {provide: (context) => new Vpc(context.scope, "vpc", {natGateways : 1})})
  .addOns(
    new MyPrivateMetricAddOn({
      metricName: "my-metric",
      namespace: "my-namespace",
      dimensionsMap: {
        "my-dimension": "my-dimension-value",
      },
    })
  )
  .build(app, "eks-blueprint-with-metric");

// Reflect.defineMetadata("ordered", true, bp.addons.AwsLoadBalancerControllerAddOn);
// bp.EksBlueprint.builder()
//   .addOns(...this.addOns)
//   .resourceProvider(bp.GlobalResources.Vpc, new bp.VpcProvider("vpc-XXXXXXXXXXXX"))
//   .resourceProvider("node-role", this.nodeRole)
//   .resourceProvider("apache-airflow-s3-bucket-provider", this.apacheAirflowS3Bucket)
//   .resourceProvider("apache-airflow-efs-provider", this.apacheAirflowEfs)
//   .clusterProvider(this.clusterProvider)
//   .resourceProvider(
//     this.ampWorkspaceName,
//     new bp.CreateAmpProvider(this.ampWorkspaceName, this.ampWorkspaceName)
//   )
//   .teams(
//     ...this.teams,
//     new bp.EmrEksTeam(this.dataTeam),
//     new bp.BatchEksTeam(this.batchTeam)
//   )
//   .enableControlPlaneLogTypes(bp.ControlPlaneLogType.API)
//   .build(scope, blueprintID, props);
