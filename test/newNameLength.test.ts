import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { kMaxLength } from 'buffer';
import { AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { BlueprintBuilder, stacks } from '../lib';
import { z } from 'zod';
import { Result } from 'aws-cdk-lib/aws-stepfunctions';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];

//This makes an array result to hold pre made default blueprints without the build yet added for testing purposes.
function getConstrainstDataSet(): BlueprintBuilder[] {
  const result: BlueprintBuilder[] = [];
  const blueprint1 = blueprints.EksBlueprint.builder().addOns(...addOns);
  const blueprint2 = blueprints.EksBlueprint.builder().addOns(...addOns);
  const blueprint3 = blueprints.EksBlueprint.builder().addOns(...addOns);
  const blueprint4 = blueprints.EksBlueprint.builder().addOns(...addOns);

  result.push(blueprint1);
  result.push(blueprint2);
  result.push(blueprint3);
  result.push(blueprint4);

  return result;
};
/*
//below you build each example testing a given exception you want to see thrown.
If I end up needing a for each loop for this here is a draft. 
var i = 0;
getConstrainstDataSet().forEach(e => {expect(e.build(app, 'blueprint'))).toThrow(...);});
*/

//Below is my first test to deal with a node group name being longer than 63 characters 

test("Testing length error!", () => {
  //try {
    expect(() => getConstrainstDataSet().at(0)?.build(app, 'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work'))
      .toThrow('Must be no more than 63 characters long.');
 // } catch (e) {
 //   console.log("Caught it!");
 // }
});



/*
Below is test templates for later on as I add more

test("Testing length error for !", () => {
  expect(getConstrainstDataSet().at(0)?.build(app,''))
    .toThrow("Must be no more than  characters long.");
});

test("Testing length error for !", () => {
  expect(getConstrainstDataSet().at(0)?.build(app,''))
    .toThrow("Must be no more than  characters long.");
});
*/


