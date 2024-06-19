import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

describe('Unit tests for Kubernetes Ingress addon', () => {
    test("Stack creation fails due to missing AwsLoadBalancerController AddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        const ingressProps = {
            crossZoneEnabled: true,
            internetFacing: true,
            targetType: 'ip',
            externalDnsHostname: 'example.com',
            certificateResourceName: 'arn:aws:acm:us-west-2:123456789:certificate/abcd1234'
        };

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KubernetesIngressAddOn(ingressProps));

        expect(() => {
            blueprint.build(app, 'ingress-addon-missing-dependency');
        }).toThrow("Missing a dependency for AwsLoadBalancerControllerAddOn for ingress-addon-missing-dependency");
    });

    test("Kubernetes Ingress stack creation succeeds with Load Balancer", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        const ingressProps = {
            crossZoneEnabled: true,
            internetFacing: true,
            targetType: 'ip',
            externalDnsHostname: 'example.com',
            certificateResourceName: 'arn:aws:acm:us-west-2:123456789:certificate/abcd1234'
        };

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.AwsLoadBalancerControllerAddOn())
            .addOns(new blueprints.KubernetesIngressAddOn(ingressProps))
            .build(app, 'ingress-stack-succeeds');

        expect(blueprint).toBeDefined();
    });
});
