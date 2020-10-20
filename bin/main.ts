#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { CdkEksBlueprintStack } from '../lib/cdk-eks-blueprint-stack';

const app = new cdk.App();


new CdkEksBlueprintStack(app, 'east-dev-stack', "dev1", {
    env: {
        region: 'us-east-2'
    }
});

new CdkEksBlueprintStack(app, 'west-dev-stack', "dev1", {
    env: {
        region: 'us-west-2'
    }
});