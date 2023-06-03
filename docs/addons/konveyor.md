# Konveyor Amazon EKS Blueprints AddOn

This add-on installs [Konveyor](https://konveyor.github.io/).

## Dependencies

The add-on depends on the following components:
- Operator Lifecycle Manager add-on (_OlmAddOn_)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/) add-on (_AwsLoadBalancerControllerAddOn_), which will instantiate an [ALB](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html) to fulfill the Ingress deployed by this add-on
- [EBS CSI Driver Amazon EKS add-on](https://aws-quickstart.github.io/cdk-eks-blueprints/addons/ebs-csi-driver/) (_EbsCsiDriverAddOn_), to provide Persistent Volumes (PVs) fulfilling Konveyor's Persistent Volume Claims (PVCs)
- a subdomain for the Konveyor application
- a certificate for the subdomain, made available by the either _CreateCertificateProvider_ or _ImportCertificateProvider_, to be assigned to the load balancer
- 

## Setup

For a fully working setup, please see the Konveyor pattern in the EKS Blueprints Pattern [repository](https://github.com/aws-samples/cdk-eks-blueprints-patterns).