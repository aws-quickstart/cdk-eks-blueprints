#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import BlueprintIPV6Construct from '../examples/blueprint-ipv6-construct';
import BlueprintIPv4Construct from "../examples/blueprint-ipv4-construct";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
let props = { env: { account, region } };
new BlueprintIPv4Construct(app, props);

// Deploying IPV6 cluster in us-east-2 region. Assuming IPV4 cluster will be deployed to another region.
props = { env: { account,  region: "us-east-2" } };
// Create ipv6 cluster: temporarily removed from the e2e tests due to the timeouts.
new BlueprintIPV6Construct(app, props);
