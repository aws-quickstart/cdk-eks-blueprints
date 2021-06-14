#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'

const app = new cdk.App()
let account: string, region: string
let context_account: string, context_region :string

context_account = valueFromContext(app, "account", false)
context_region = valueFromContext(app, "region", false)
if (context_account.trim() != "") {
    account = context_account
}
else {
    account = <string> process.env.CDK_DEFAULT_ACCOUNT
}

if (context_region.trim() != "") {
    region = context_region
}
else {
    region = <string> process.env.CDK_DEFAULT_REGION
}
const env = { account, region }


//-------------------------------------------
// Single Cluster with multiple teams.
//-------------------------------------------

import MultiTeamConstruct from '../examples/multi-team-construct'
new MultiTeamConstruct(app, 'multi-team')


//-------------------------------------------
// Multiple clusters, multiple regions.
//-------------------------------------------

import MultiRegionConstruct from '../examples/multi-region-construct'
new MultiRegionConstruct(app, 'multi-region')


//-------------------------------------------
// Single Fargate cluster.
//-------------------------------------------

import FargateConstruct from '../examples/fargate-construct'
new FargateConstruct(app, 'fargate', { env })


//-------------------------------------------
// Multiple clusters with deployment pipeline.
//-------------------------------------------

import PipelineStack from '../examples/pipeline-stack'
new PipelineStack(app, 'pipeline', { env })


//-------------------------------------------
// Single cluster with Bottlerocket nodes.
//-------------------------------------------

import BottleRocketConstruct from '../examples/bottlerocket-construct'
new BottleRocketConstruct(app, 'bottlerocket', { env })


//-------------------------------------------
// Single cluster with custom configuration.
//-------------------------------------------

import CustomClusterConstruct from '../examples/custom-cluster-construct'
import {valueFromContext} from "../lib/utils/context-utils";
new CustomClusterConstruct(app, 'custom-cluster', { env })

