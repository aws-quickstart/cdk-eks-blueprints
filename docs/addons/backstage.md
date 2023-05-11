# Backstage Amazon EKS Blueprints AddOn

This add-on installs [Backstage](https://backstage.io/).

## Dependencies

The add-on depends on the following components:
- a Backstage Docker image stored in a Container Registry
- a subdomain for the Backstage application 
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/), which will instanciate an [ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) to fulfill the Ingress installed by the Backstage's Helm chart; the dependency is satisfied by _AwsLoadBalancerControllerAddOn_, which needs to be included in the list of add-ons
- a certificate for the subdomain, made available by the _CreateCertificateProvider_, to be assigned to the load balancer
- a database instance, implementing the _IDatabaseInstance_ interface and registered by a resource provider
- a _Secret_ deployed in the cluster, which will be used to [expose the database credentials as environement variables](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-environment-variables): _${POSTGRES\_USER}_ and _${POSTGRES\_PASSWORD}_

## Setup

For a fully working setup, please see the Backstage pattern in the EKS Blueprints Pattern [repository](https://github.com/freschri/cdk-eks-blueprints-patterns).