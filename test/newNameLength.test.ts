import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
//import {z, ZodError} from "zod";
import { kMaxLength } from 'buffer';
import { AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { stacks } from '../lib';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
]; 
const stack = blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .build(app,  'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work');

  describe('Running my practice test.', () => {
   it("Testing length error!", () => {
      expect(stack.getClusterInfo().cluster.node.id).toBeLessThan(63);
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      console.log(stack.getClusterInfo().cluster.node.id);
});
  });



/*
nam: z.string().min(minLength: 1, "please have a name at least 1 long") && nam: z.string().max(kMaxLength: 63, "Please make a name no longer than 63")
*/