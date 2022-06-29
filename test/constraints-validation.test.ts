import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { BlueprintBuilder, ControlPlaneLogTypes } from '../lib';
import { z, ZodError } from 'zod';

const longName = 'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];

function getConstraintsDataSet(): [BlueprintBuilder, ZodError][] {
  let result: [BlueprintBuilder, ZodError][] = [];
  const blueprint1 = blueprints.EksBlueprint.builder().addOns(...addOns).name(longName);
  const blueprint1ZodError = new z.ZodError([]);

  //Seeing if this might be what I need for crafting my zod error to what I need it to be
  const testing = z.array(z.string()).superRefine((val, ctx) => {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 3,
        type: "array",
        inclusive: true,
        message: "Too many items",
      });
  });


  const blueprint2 = blueprints.EksBlueprint.builder().addOns(...addOns).enableControlPlaneLogTypes(ControlPlaneLogTypes.api);
  const blueprint2ZodError = new z.ZodError([]);

  result.push([blueprint1, blueprint1ZodError]);
  result.push([blueprint2, blueprint2ZodError]);

  return result;
}

test("For Each loop test.", () => {
  getConstraintsDataSet().forEach((e, index) => {
    expect(() => e[index][0].build(app, longName + index))
      .toThrow(e[index][1]);
  });
});