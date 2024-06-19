import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

const neuronMonitorAddOnProps = {
    namespace: "test-namespace",
    imageTag: "1.0.0",
    port: 9010
  } as blueprints.NeuronMonitorAddOnProps;

describe('Unit tests for Neuron addon', () => {

    test("Stack creation fails due to missing Device Plugin Addon", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.NeuronMonitorAddOn(neuronMonitorAddOnProps));

        expect(()=> {
            blueprint.build(app, 'neuron-monitor-missing-dependency');
        }).toThrow("Missing a dependency for NeuronDevicePluginAddOn for neuron-monitor-missing-dependency");
    });

    test("Neuron Device Stack creation succeeds", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.NeuronDevicePluginAddOn())
            .build(app, 'neuron-device-stack-succeeds');

        expect(blueprint).toBeDefined();
    });

    test("Neuron Monitor Stack creation succeeds", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.NeuronDevicePluginAddOn())
            .addOns(new blueprints.NeuronMonitorAddOn(neuronMonitorAddOnProps))
            .build(app, 'neuron-monitor-stack-succeeds');

        expect(blueprint).toBeDefined();
    });
});
