# NGINX AddOn

## Usage

```typescript
import { NginxAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const subdomain  = ...;
const nginxAddOn = new NginxAddOn(({ 
    internetFacing: true, 
    backendProtocol: "tcp", 
    externaDnsHostname: subdomain, 
    crossZoneEnabled: false 
    }));
const addOns: Array<ClusterAddOn> = [ xrayAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

Once deployed, it allows applications to be instrumented with X-Ray by leveraging the X-Ray SDK.  Examples of such integration can be found on [GitHub](https://github.com/aws-samples/aws-xray-kubernetes).

## Configuration


 /**
     * tcp, http
     */
    backendProtocol?: string,

    /**
     * Enabling cross AZ loadbalancing for 
     */
    crossZoneEnabled?: boolean,

    /**
     * If the load balancer created for the ingress is internet facing.
     * Internal if set to false.
     */
    internetFacing?: boolean,

    /**
     * IP or instance mode. Default: IP, requires VPC-CNI, has better performance eliminating a hop through kubeproxy
     * Instance mode: traditional NodePort mode on the instance. 
     */
    targetType?: string,
    
    /**
     * Used in conjunction with external DNS add-on to handle automatic registration of the service with Route53.  
     */
    externaDnsHostname?: string,

    /**
     * Values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#
     */
    values?: {
        [key: string]: any;
    };

## Functionality

1. Creates the `xray-system` namespace.
2. Deploys the [`xray-daemon`](https://www.eksworkshop.com/intermediate/245_x-ray/x-ray-daemon/) manifests into the cluster.
3. Configures Kubernetes service account with IRSA (`AWSXRayDaemonWriteAccess`) for communication between the cluster and the AWS X-Ray service 

