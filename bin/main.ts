import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };

new BlueprintConstruct(app, props);