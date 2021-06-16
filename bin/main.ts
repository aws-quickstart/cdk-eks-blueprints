#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';

const app = new cdk.App();

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
new FargateConstruct(app, 'fargate');


//-------------------------------------------
// Multiple clusters with deployment pipeline.
//-------------------------------------------

import PipelineStack from '../examples/pipeline-stack'
const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }
new PipelineStack(app, 'pipeline', { env });


//-------------------------------------------
// Single cluster with Bottlerocket nodes.
//-------------------------------------------

import BottleRocketConstruct from '../examples/bottlerocket-construct'
new BottleRocketConstruct(app, 'bottlerocket');


//-------------------------------------------
// Single cluster with custom configuration.
//-------------------------------------------

import CustomClusterConstruct from '../examples/custom-cluster-construct'
new CustomClusterConstruct(app, 'custom-cluster');

//-------------------------------------------
// Single Private Cluster.
//-------------------------------------------

import PrivateClusterConstruct from '../examples/private-cluster-construct'
new PrivateClusterConstruct(app, 'private-cluster');