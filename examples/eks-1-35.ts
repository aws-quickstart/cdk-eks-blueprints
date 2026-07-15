import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks-v2';
import * as blueprints from '../lib';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .version(KubernetesVersion.V1_35)
    .build(app, 'eks-1-35-debug-stack');

void stack;
