import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ssp from '../lib/stacks/eks-blueprint-stack';

test('Usage tracking created', () => {
    const app = new cdk.App();
    // WHEN
    let stack = new ssp.EksBlueprint(app, { id: 'MyTestStack' });
    console.log(stack.templateOptions.description);
    // THEN
    expect(stack.templateOptions.description).toContain("SSP tacking (qs");

    stack = new ssp.EksBlueprint(app, { id: 'MyOtherTestStack' }, {
        description: "My awesome description"
    });

    console.log(stack.templateOptions.description);
    // AND
    expect(stack.templateOptions.description).toContain("SSP tacking (qs");

});

