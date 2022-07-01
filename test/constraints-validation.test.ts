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
  const blueprint1 = blueprints.EksBlueprint.builder().addOns(...addOns).id(longName);
  
  const blueprint1ZodError = new z.ZodError([{
    code: "too_big",
    maximum: 63,
    type: "string",
    inclusive: true,
    path: [],
    message: "sdfasdf"
  }]);

  const blueprint2 = blueprints.EksBlueprint.builder().addOns(...addOns).enableControlPlaneLogTypes(ControlPlaneLogTypes.api).name(longName);
  const blueprint2ZodError = new z.ZodError([{
    //code: "too_small",
    code: "too_big",
    maximum: 63,
    //minimum: 1,
    type: "string",
    inclusive: true,
    path: [],
    message: "sdfasdf"
  }]);

  result.push([blueprint1, blueprint1ZodError]);
  result.push([blueprint2, blueprint2ZodError]);

  return result;
}

test("For Each loop test.", () => {
  getConstraintsDataSet().forEach((ex) => {
    try{
     ex[0].build(app, ex[0].props.id!);//be sure all tests built have a id defined before this!
     expect(true).toBe(false);
     
    } catch(e) {
      if(e instanceof z.ZodError){ //we are testing for code, maximum/minimum, and type
        const eMax = (e.issues[0] as any).maximum;
        const eMin = (e.issues[0] as any).minimum;
        const eCode = (e.issues[0] as any).code;
        const eType = (e.issues[0] as any).type;

        const exMax = (ex[1].issues[0] as any).maximum;
        const exMin = (ex[1].issues[0] as any).minimum;
        const exCode = (ex[1].issues[0] as any).code;
        const exType = (ex[1].issues[0] as any).type;

        expect( ((eMax ?? 11) == (exMax ?? 12) || //in case its min or max since that can differe I added this OR
        (eMin ?? 11) == (exMin ?? 12)) &&//checks if maximum matches
        eCode == exCode &&//checks if code matches
        eType == exType).toBe(true);//checks if type matches
      }
  }
  });
});