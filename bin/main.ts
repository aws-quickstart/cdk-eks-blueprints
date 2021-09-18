import * as cdk from '@aws-cdk/core';
import * as ssp from '../lib';

const app = new cdk.App();

// AddOns for the cluster.
const addOns: Array<ssp.ClusterAddOn> = [
  new ssp.addons.ArgoCDAddOn,
  new ssp.addons.CalicoAddOn,
  new ssp.addons.MetricsServerAddOn,
  new ssp.addons.ContainerInsightsAddOn,
  new ssp.addons.AwsLoadBalancerControllerAddOn(),
  new ssp.addons.VeleroAddOn(),
];

const account = '<AWS Account Number>'
const region = '<Region>'

const props = { env: { account, region } }
new ssp.EksBlueprint(
  app, 
  { 
    id: 'haofei-ssp-blueprint', 
    addOns,
  }, 
  props
);