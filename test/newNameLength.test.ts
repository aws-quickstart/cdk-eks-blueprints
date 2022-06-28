import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { BlueprintBuilder, ControlPlaneLogTypes } from '../lib';
import { z } from 'zod';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];

function getConstraintsDataSet(): BlueprintBuilder[] {
  const result: BlueprintBuilder[] = [];
  const blueprint1 = blueprints.EksBlueprint.builder().addOns(...addOns).name("eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work");
  const blueprint2 = blueprints.EksBlueprint.builder().addOns(...addOns).enableControlPlaneLogTypes(ControlPlaneLogTypes.api);

  result.push(blueprint1);
  result.push(blueprint2);

  return result;
}

const longName = 'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work';

test("Testing ID length error!", () => {
  expect(() => getConstraintsDataSet().at(1)?.build(app, longName))
    .toThrow(z.ZodIssueCode.too_big);
});

test("Testing name length error!", () => {
  expect(() => getConstraintsDataSet().at(0)?.build(app, "longName"))
    .toThrow(z.ZodIssueCode.too_big);
});
