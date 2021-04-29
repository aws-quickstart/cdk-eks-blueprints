import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkEksBlueprint from '../lib/stacks/eks-blueprint-stack';

test('SQS Queue Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkEksBlueprint.CdkEksBlueprintStack(app, { id: 'MyTestStack' });
    // THEN
    expectCDK(stack).to(haveResource("AWS::SQS::Queue", {
        VisibilityTimeout: 300
    }));
});

test('SNS Topic Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkEksBlueprint.CdkEksBlueprintStack(app, { id: 'MyTestStack' });
    // THEN
    expectCDK(stack).to(haveResource("AWS::SNS::Topic"));
});
