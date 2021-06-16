#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'
import { valueFromContext } from '../lib/utils/context-utils'

const app = new cdk.App()
const ACCOUNT_KEY = "account"
const REGION_KEY = "region"

const accountProcess: string = <string> process.env.CDK_DEFAULT_ACCOUNT
const regionProcess: string =  <string> process.env.CDK_DEFAULT_REGION

const account: string  = valueFromContext(app, ACCOUNT_KEY, accountProcess)
const region: string  = valueFromContext(app, REGION_KEY, regionProcess)

if (account == "" || account == null)
    throw "Account not set, please see Readme"
if (region == "" || region == null)
    throw "Region not set, please see Readme"

const env = {account, region}

//-------------------------------------------
// Single Cluster with multiple teams.
//-------------------------------------------

import MultiTeamConstruct from '../examples/multi-team-construct'
new MultiTeamConstruct(app, 'multi-team');


//-------------------------------------------
// Multiple clusters, multiple regions.
//-------------------------------------------

import MultiRegionConstruct from '../examples/multi-region-construct'
new MultiRegionConstruct(app, 'multi-region');


//-------------------------------------------
// Single Fargate cluster.
//-------------------------------------------

import FargateConstruct from '../examples/fargate-construct'
new FargateConstruct(app, 'fargate', { env });


//-------------------------------------------
// Multiple clusters with deployment pipeline.
//-------------------------------------------

import PipelineStack from '../examples/pipeline-stack'
new PipelineStack(app, 'pipeline', { env });


//-------------------------------------------
// Single cluster with Bottlerocket nodes.
//-------------------------------------------

import BottleRocketConstruct from '../examples/bottlerocket-construct'
new BottleRocketConstruct(app, 'bottlerocket', { env })


//-------------------------------------------
// Single cluster with custom configuration.
//-------------------------------------------

import CustomClusterConstruct from '../examples/custom-cluster-construct'
new CustomClusterConstruct(app, 'custom-cluster', { env })

