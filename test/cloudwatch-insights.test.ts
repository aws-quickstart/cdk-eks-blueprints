import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import {CloudWatchInsightsAddOnProps, Values} from "../lib";
import {Match, Template} from "aws-cdk-lib/assertions";

const customAgentConfig: Values = {
  "agent": {
    "metrics_collection_interval": 20,
    "metrics": {
      "metrics_collected": {
        "collectd": {},
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_USAGE_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_nice", "unit": "Percent"},
          "cpu_usage_guest"
        ],
        "totalcpu": false,
        "drop_original_metrics": [ "cpu_usage_guest" ],
      }
    },
    "config": {
      "logs": {
        "metrics_collected": {
          "app_signals": {},
          "kubernetes": {
            "enhanced_container_insights": true
          }
        }
      },
      "traces": {
        "traces_collected": {
          "app_signals": {}
        }
      }
    }
  }
};

const cloudwatchInsightsAddOnProps = {
  version: "v1.2.1-eksbuild.1",
  customCloudWatchAgentConfig: customAgentConfig
} as CloudWatchInsightsAddOnProps;

describe('Unit test for CloudWatch Addon', () => {

  test("Stack accepts the assigned version from the override", () => {
    const app = new cdk.App();

    const blueprint = blueprints.EksBlueprint.builder()
      .version("auto")
      .account("123456789012").region('us-east-2')
      .addOns(new blueprints.CloudWatchInsights(cloudwatchInsightsAddOnProps))
      .build(app,  'cloudwatch-insights-version-respected');

    const template = Template.fromStack(blueprint);

    template.hasResource("AWS::EKS::Addon", {
      Properties: {
        "AddonVersion": Match.stringLikeRegexp("v1.2.1-eksbuild.1"),
        "ConfigurationValues": Match.exact(JSON.stringify(customAgentConfig))
      }
    });
  });
});