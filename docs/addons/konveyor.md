# Konveyor Amazon EKS Blueprints AddOn

This add-on installs [Konveyor](https://konveyor.github.io/).

Konveyor helps large organizations modernize enterprise java applications to Kubernetes. It serves as a platform providing a view of an organization's applications, allowing Assessment and Analysis capabilities to be executed at scale to help Architects get a better feel of the issues present in application source code in regard to deploying to a new environment such as Kubernetes, or other technologies.

It is structured around the concept of a [Unified Experience](https://github.com/konveyor/enhancements/tree/master/enhancements/unified_experience) to aid multiple personas such as Enterprise Architects who manage modernization engagements as well as the Migrators, or developers who carry out the specific refactoring development work.

Konveyor [is released as an Operator](https://github.com/konveyor/tackle2-operator).

The Konveyor operator deploys the components below:

- [Analysis](https://github.com/windup/windup)
- [Hub](https://github.com/konveyor/tackle2-hub)
- [UI](https://github.com/konveyor/tackle2-ui)
- [Assessments](https://github.com/konveyor/tackle-pathfinder)


## Dependencies

The add-on depends on the following components:
- Operator Lifecycle Manager add-on (_OlmAddOn_)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/) add-on (_AwsLoadBalancerControllerAddOn_), which will instantiate an [ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) to fulfill the Ingress deployed by this add-on
- [EBS CSI Driver Amazon EKS add-on](https://aws-quickstart.github.io/cdk-eks-blueprints/addons/ebs-csi-driver/) (_EbsCsiDriverAddOn_), to provide Persistent Volumes (PVs) fulfilling Konveyor's Persistent Volume Claims (PVCs)
- a subdomain for the Konveyor application
- a certificate for the subdomain, made available by the either _CreateCertificateProvider_ or _ImportCertificateProvider_, to be assigned to the load balancer

## Setup

For a fully working setup, please see the Konveyor pattern in the EKS Blueprints Pattern [repository](https://github.com/aws-samples/cdk-eks-blueprints-patterns).