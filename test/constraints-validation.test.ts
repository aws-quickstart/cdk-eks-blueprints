import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { BlueprintBuilder, ControlPlaneLogType } from '../lib';
import { z, ZodError } from 'zod';

const longName = 'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];
type BlueprintBuilderError = [BlueprintBuilder, ZodError];

function getConstraintsDataSet(): BlueprintBuilderError[] {
  let result: [BlueprintBuilder, ZodError][] = [];
  const blueprint1 = blueprints.EksBlueprint.builder().addOns(...addOns).id(longName);

  const blueprint1ZodError = new z.ZodError([{
    code: "too_big",
    maximum: 63,
    type: "string",
    inclusive: true,
    path: [],
    message: "Big"
  }]);

  const blueprint2 = blueprints.EksBlueprint.builder().addOns(...addOns).enableControlPlaneLogTypes(ControlPlaneLogType.authenticator).name(longName);
  const blueprint2ZodError = new z.ZodError([{
    code: "too_big",
    maximum: 63,
    type: "string",
    inclusive: true,
    path: [],
    message: "Big"
  }]);

  result.push([blueprint1, blueprint1ZodError]);
  result.push([blueprint2, blueprint2ZodError]);

  return result;
}

function compareObjectFields(object1: any, object2: any) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }
  for (let key of keys1) {
    if (key == "message" || key == "path" || key == "inclusive") {
      continue;
    }

    if (object1[key] !== object2[key]) {
      return false;
    }
  }
  return true;
}

test("For Each loop test.", () => {
  getConstraintsDataSet().forEach((ex) => {
    try {
      ex[0].build(app, ex[0].props.id!);//be sure all tests built have a id defined before this!
      expect(true).toBe(false);

    } catch (e) {
      if (e instanceof z.ZodError) {
        const thrownError = (e.issues[0] as any);
        const customError = (ex[1].issues[0] as any);

        expect(compareObjectFields(thrownError, customError)).toBe(true);
      }
    }
  });
});