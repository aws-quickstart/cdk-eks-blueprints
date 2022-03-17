#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';

import BlueprintConstruct from '../examples/blueprint-construct';
import { EksBlueprint } from '../lib';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };
const id = 'blueprint-construct';

new BlueprintConstruct(app, { id }, props);
