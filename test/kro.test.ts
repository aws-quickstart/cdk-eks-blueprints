import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Unit tests for KRO addon', () => {

    test("Stack creation succeeds with default props", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KroAddOn())
            .build(app, 'kro-default');

        const template = Template.fromStack(stack);
        template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
            Chart: "kro",
            Repository: "oci://registry.k8s.io/kro/charts/kro",
            Namespace: "kro",
        });
    });

    test("Stack creation succeeds with custom version", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KroAddOn({ version: '0.5.0' }))
            .build(app, 'kro-custom-version');

        const template = Template.fromStack(stack);
        const helmCharts = template.findResources("Custom::AWSCDK-EKS-HelmChart");
        const kroChart = Object.values(helmCharts).find(r => {
            const chart = r.Properties?.Chart;
            return (typeof chart === 'string' ? chart : JSON.parse(chart)) === 'kro';
        });
        const version = kroChart!.Properties?.Version;
        const versionStr = typeof version === 'string' ? version : JSON.parse(version);
        expect(versionStr).toEqual('0.5.0');
    });

    test("Stack creation succeeds with custom namespace", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KroAddOn({ namespace: 'custom-kro' }))
            .build(app, 'kro-custom-ns');

        const template = Template.fromStack(stack);
        template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
            Chart: "kro",
            Namespace: "custom-kro",
        });
    });

    test("Stack creation succeeds with custom values", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KroAddOn({
                values: {
                    replicaCount: 2,
                },
            }))
            .build(app, 'kro-custom-values');

        const template = Template.fromStack(stack);
        const helmCharts = template.findResources("Custom::AWSCDK-EKS-HelmChart");
        const kroChart = Object.values(helmCharts).find(r => {
            const chart = r.Properties?.Chart;
            return (typeof chart === 'string' ? chart : JSON.parse(chart)) === 'kro';
        });
        expect(kroChart).toBeDefined();
        const values = kroChart!.Properties?.Values;
        const valuesStr = typeof values === 'string' ? values : JSON.stringify(values);
        expect(valuesStr).toContain('replicaCount');
    });
});
