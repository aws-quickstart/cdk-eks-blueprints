/**
 * Tests Gmaestro on EKS AddOn
 */

import * as blueprints from '../lib';
import * as cdk from 'aws-cdk-lib';
import {GmaestroAddOn} from "../lib/";
import {Template} from 'aws-cdk-lib/assertions';


describe('Unit tests for EKS Blueprint', () => {

    test('Blueprint builder creates correct stack', () => {
        const app = new cdk.App();

        const parentStack = blueprints.EksBlueprint.builder()
            .addOns(new GmaestroAddOn({
                namespace: "test",
                b64ClientId: "1234",
                clientName: "test_client",
                clusterName: "test_cluster",
                grafanaMetricsAuthKey: "test_metrics_auth_key",
                grafanaLogsAuthKey: "test_logs_auth_key"
            }))
            .region("us-east-1")
            .account("1234")
            .build(app, 'test-gmaestro-eks-blueprint');

        const template = Template.fromStack(parentStack);
        let GMAESTRO_ADDON_VALUES = "{\"namespace\":\"test\",\"b64ClientId\":\"1234\",\"clientName\":\"test_client\",\"clusterName\":\"test_cluster\",\"secrets\":{\"grafanaMetricsAuthKey\":\"test_metrics_auth_key\",\"grafanaLogsAuthKey\":\"test_logs_auth_key\"}}"

        template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                Release: "gmaestro",
                Chart: "gmaestro",
                Repository: "https://granulate.github.io/gmaestro-helm",
                Values: GMAESTRO_ADDON_VALUES,
            }
        );
    });
});

