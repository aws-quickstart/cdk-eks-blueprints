import * as cdk from '@aws-cdk/core';
import { CdkEksBlueprintStack } from '../lib/cdk-eks-blueprint-stack';

const app = new cdk.App();

new CdkEksBlueprintStack(app, "eks-blueprint-dev");


