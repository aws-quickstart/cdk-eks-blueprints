# What is OPA Gatekeeper?

The Open Policy Agent (OPA, pronounced “oh-pa”) is an open source, general-purpose policy engine that unifies policy enforcement across the stack. OPA provides a high-level declarative language that lets you specify policy as code and simple APIs to offload policy decision-making from your software. You can use OPA to enforce policies in microservices, Kubernetes, CI/CD pipelines, API gateways, and more. OPA uses a policy language known as Rego which is a query language which was purpose built to support structured document models such as JSON. To learn more about Rego check out this [link](https://www.openpolicyagent.org/docs/latest/policy-language/).

OPA Gatekeeper is an open-source project that provides a first-class integration between OPA and Kubernetes. What Gatekeeper adds is an extensible parameterized policy library that includes native Kubernetes CRD's for instantiating and extending the OPA policy library. The Kubernetes API Server is configured to query OPA for admission control decisions when objects (e.g., Pods, Services, etc.) are created, updated, or deleted. The API Server sends the entire Kubernetes object in the webhook request to OPA. OPA evaluates the policies it has loaded using the admission review as input. Gatekeeper also provides audit functionality as well. The diagram below shows the flow between a user making a request to the Kube-API server and how AdmissionReview and AdmissionRequests are made through OPA Gatekeeper. 

![opa](https://d33wubrfki0l68.cloudfront.net/a5ed0c27ff2dda6abb18b9bc960f2ad4120d937a/a5939/docs/latest/images/kubernetes-admission-flow.png))

In the context of a development platform running on Amazon EKS, platform teams and administrators need a way of being able to set policies to adhere to governance and security requirements for all workloads and teams working on the same cluster. Examples of standard use cases for using policies via OPA Gatekeeper are listed below:

- Which users can access which resources.
- Which subnets egress traffic is allowed to.
- Which clusters a workload must be deployed to.
- Which registries binaries can be downloaded from.
- Which OS capabilities a container can execute with.
- Which times of day the system can be accessed at.

RBAC (role-based access control) can help with some of the scenarios above but **roles are nothing but a group of permissions that you then assign to users leveraging rolebindings.** If for example, a user tries to perform an operation (get, list, watch, create, etc...) that particular user may do so if they have the appropriate role. **Please note that RBAC should be used in conjunction with OPA Gatekeeper policies to fully secure your cluster.**

## Key Terminology

- OPA Constraint Framework - Framework that enforces CRD-based policies and allow declaratively configured policies to be reliably shareable
- Constraint -  A Constraint is a declaration that its author wants a system to meet a given set of requirements. Each Constraint is written with Rego, a declarative query language used by OPA to enumerate instances of data that violate the expected state of the system. All Constraints are evaluated as a logical AND. If one Constraint is not satisfied, then the whole request is rejected.
- Enforcement Point - Places where constraints can be enforced. Examples are Git hooks, Kubernetes admission controllers, and audit systems.
- Constraint Template - Templates that allows users to declare new constraints 
- Target - Represents a coherent set of objects sharing a common identification and/or selection scheme, generic purpose, and can be analyzed in the same validation context

## Usage

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const account = <AWS_ACCOUNT_ID>;
const region = <AWS_REGION>;

const blueprint = blueprints.EksBlueprint.builder()
  .account(account) 
  .region(region)
  .addOns( new blueprints.addons.OpaGatekeeperAddOn() )
  .teams().build(app, 'my-stack-name');
```

To validate that OPA Gatekeeper is running within your cluster run the following command:

```bash
k get po -n gatekeeper-system
```

You should see the following output:

```bash
NAME                                             READY   STATUS    RESTARTS   AGE
gatekeeper-audit-7c5998d4c-b5n7j                 1/1     Running   0          1d
gatekeeper-controller-manager-5894545cc9-b86zm   1/1     Running   0          1d
gatekeeper-controller-manager-5894545cc9-bntdt   1/1     Running   0          1d
gatekeeper-controller-manager-5894545cc9-tb7fz   1/1     Running   0          1d
```
You will notice the `gatekeeper-audit-7c5998d4c-b5n7j` pod that is created when we deploy the `OpaGatekeeperAddOn`. The audit functionality enables periodic evaluations of replicated resources against the Constraints enforced in the cluster to detect pre-existing misconfigurations. Gatekeeper stores audit results as violations listed in the status field of the relevant Constraint. The `gatekeeper-controller-manager` is simply there to manage the `OpaGatekeeperAddOn`. 

## Example with OPA Gatekeeper

For the purposes of operating within a platform defined by `EKS Blueprints`, we will be focusing on how to use a policy driven approach to secure our cluster using OPA Gatekeeper. The OPA Gatekeeper community has created a library of example policies and constraint templates which can be found [here](https://github.com/open-policy-agent/gatekeeper-library/tree/master/library/general). In this example we will create a policy that enforces including labels for newly created namespaces and pods. The ConstraintTemplate can be found [here](https://github.com/open-policy-agent/gatekeeper-library/blob/master/library/general/requiredlabels/template.yaml).

Run the following command to create the ConstraintTemplate:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/requiredlabels/template.yaml
```

To verify that the ConstraintTemplate was created run the following command:

```bash
kubectl get constrainttemplate
```

You should see the following output:

```bash
NAME                AGE
k8srequiredlabels   45s
```

You will notice that if you create a new namespace without any labels that the request will go through and that is because we now need to create the individual `Constraint CRD` as defined by the `Constraint Template` that we created above. Let's create the individal `Constraint CRD` using the command below: 

```bash
k apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/requiredlabels/samples/all-must-have-owner/constraint.yaml           
```

If we then try and create a namespace by running `kubectl create ns test` (notice that we are not adding any labels) you will get the following error message:

```bash
Error from server ([all-must-have-owner] All namespaces must have an `owner` label that points to your company username): admission webhook "validation.gatekeeper.sh" denied the request: [all-must-have-owner] All namespaces must have an `owner` label that points to your company username
```

For more information on OPA Gatekeeper please refer to the links below:

- https://github.com/open-policy-agent
- https://open-policy-agent.github.io/gatekeeper/website/docs/
- https://github.com/open-policy-agent/gatekeeper-library 