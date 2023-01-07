#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = 'us-east-2';
const props = { env: { account, region } };

const addOns = [
    new blueprints.addons.IstioBaseAddOn(),
    new blueprints.addons.IstioControlPlaneAddOn(),
    new blueprints.addons.KNativeOperator()
];

blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .build(app, 'knative-test', props);
