# What is OPA Gatekeeper?

The Open Policy Agent (OPA, pronounced “oh-pa”) is an open source, general-purpose policy engine that unifies policy enforcement across the stack. OPA provides a high-level declarative language that lets you specify policy as code and simple APIs to offload policy decision-making from your software. You can use OPA to enforce policies in microservices, Kubernetes, CI/CD pipelines, API gateways, and more. OPA uses a policy language known as Rego which is a query language which was purpose built to support structured document models such as JSON. To learn more about Rego check out this [link](https://www.openpolicyagent.org/docs/latest/policy-language/).

OPA Gatekeeper is an open-source project that provides a first-class integration between OPA and Kubernetes. What Gatekeeper adds is an extensible parameterized policy library that includes native Kubernetes CRD's for instantiating and extending the OPA policy library. Gatekeeper also provides audit functionality as well. The diagram below shows how Gatekeeper interacts with the Kube API Server

In the context of a Shared Services Platform running on Amazon EKS, platform teams and administrators need a way of being able to set policies to adhere to governance and security requirements for all workloads and teams working on the same cluster. Examples of standard use cases for using policies via OPA Gatekeeper are shown below:

- Which users can access which resources.
- Which subnets egress traffic is allowed to.
- Which clusters a workload must be deployed to.
- Which registries binaries can be downloaded from.
- Which OS capabilities a container can execute with.
- Which times of day the system can be accessed at.

## How does Gatekeeper work with OPA and Kube-mgmt?

The Kubernetes API Server is configured to query OPA for admission control decisions when objects (e.g., Pods, Services, etc.) are created, updated, or deleted. The API Server sends the entire Kubernetes object in the webhook request to OPA. OPA evaluates the policies it has loaded using the admission review as input. The diagram below shows the flow between a user making a request to the Kube-API server and how AdmissionReview and AdmissionRequests are made through OPA Gatekeeper.

![opa](https://d33wubrfki0l68.cloudfront.net/a5ed0c27ff2dda6abb18b9bc960f2ad4120d937a/a5939/docs/latest/images/kubernetes-admission-flow.png))


## Example Policies
The following policy denies objects that include container images referring to illegal registries:

```rego
package kubernetes.admission

deny[reason] {
  some container
  input_containers[container]
  not startswith(container.image, "hooli.com/")
  reason := "container image refers to illegal registry (must be hooli.com)"
}

input_containers[container] {
  container := input.request.object.spec.containers[_]
}

input_containers[container] {
  container := input.request.object.spec.template.spec.containers[_]
}
```
When deny is evaluated with the input defined below the answer is:
```json
[
  "container image refers to illegal registry (must be hooli.com)"
]
```

The input document contains the following fields:

- input.request.kind specifies the type of the object (e.g., Pod, Service, etc.)
- input.request.operation specifies the type of the operation, i.e., CREATE, UPDATE, DELETE, CONNECT.
- input.request.userInfo specifies the identity of the caller.
- input.request.object contains the entire Kubernetes object.
- input.request.oldObject specifies the previous version of the Kubernetes object on UPDATE and DELETE.

The policies you give to OPA ultimately generate an admission review response that is sent back to the API Server. Gatekeeper 


### What are Pod Security Policies (PSP's)?
Pod Security Policies (PSP's) is a common use case you will see being defined by Gatekeeper within a Kubernetes cluster. A Pod Security Policy (PSP) is a cluster-level resource for managing security aspects of a pod specification. PSP's allow you to control things like the ability to run privileged containers or the ability to control access to host filesystems. The example below shows a policy that is assigned to all authenticated users in a cluster which limits volume types, denies running as root/escalating to root, requires a security profile, and a few other aspects.

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: 'docker/default'
    apparmor.security.beta.kubernetes.io/allowedProfileNames: 'runtime/default'
    seccomp.security.alpha.kubernetes.io/defaultProfileName:  'docker/default'
    apparmor.security.beta.kubernetes.io/defaultProfileName:  'runtime/default'
spec:
  privileged: false
  # Required to prevent escalations to root.
  allowPrivilegeEscalation: false
  # This is redundant with non-root + disallow privilege escalation,
  # but we can provide it for defense in depth.
  requiredDropCapabilities:
    - ALL
  # Allow core volume types.
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    # Assume that persistentVolumes set up by the cluster admin are safe to use.
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    # Require the container to run without root privileges.
    rule: 'MustRunAsNonRoot'
  seLinux:
    # This policy assumes the nodes are using AppArmor rather than SELinux.
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'MustRunAs'
    ranges:
      # Forbid adding the root group.
      - min: 1
        max: 65535
  fsGroup:
    rule: 'MustRunAs'
    ranges:
      # Forbid adding the root group.
      - min: 1
        max: 65535
  readOnlyRootFilesystem: false
```


**Note: PSP's will be deprecated as of Kubernetes version 1.21 so please keep that in mind while you are evaluating this add on. To learn more please follow this [link](https://kubernetes.io/blog/2021/04/06/podsecuritypolicy-deprecation-past-present-and-future/)**

## Getting Started with OPA Gatekeeper

For the purposes of operating within a Shared Services Platform, we will be focusing on how to use a policy driven approach to secure our cluster using OPA Gatekeeper. You will see a directory with a set of example policies you can use to get started which can be found [here](https://github.com/open-policy-agent/gatekeeper-library/tree/master/library/general). In this example we will create a policy that limits what repositories containers can be pulled from. The policy that we will be using can be found [here](https://github.com/open-policy-agent/gatekeeper-library/tree/master/library/general/allowedrepos). 

The policy should look like the following: 

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
  annotations:
    description: Requires container images to begin with a repo string from a specified
      list.
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        # Schema for the `parameters` field
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
          not any(satisfied)
          msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
          not any(satisfied)
          msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
        }
```

If we apply this to our cluster by running 

