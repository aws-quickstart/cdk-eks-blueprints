# Argo CD Add-on

[Argo CD](https://argoproj.github.io/argo-cd/) is a declarative, GitOps continuous delivery tool for Kubernetes. The Argo CD add-on provisions [Argo CD](https://argoproj.github.io/argo-cd/) into an EKS cluster, and can optionally bootstrap your workloads from public and private repositories. This allows platform administrators to combine cluster provisioning and workload bootstrapping in a single step and enable use cases such as replicating an existing running production cluster in a different region in a matter of minutes. This is important for business continuity and disaster recovery cases as well as for cross-regional availability and geographical expansion.

Please see the documentation below for details on automatic boostrapping with ArgoCD add-on. If you prefer manual bootstrapping (once your cluster is deployed with this add-on included), you can find instructions on getting started with Argo CD in our [Getting Started](/getting-started/#deploy-workloads-with-argocd) guide.

Full Argo CD project documentation [can be found here](https://argoproj.github.io/argo-cd/).

## Usage

To provision and maintain ArgoCD components without any bootstrapping the add-on allows no-argument constructor to get started. 

```typescript
import { ArgoCDAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const argoCDAddOn = new ArgoCDAddOn();
const addOns: Array<ClusterAddOn> = [ argoCDAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

The above will use `argocd` namespace and install all the components. In order to bootstrap workloads you will need to change the default ArgoCD admin password and add repositories as specified in the [Getting Started](https://argoproj.github.io/argo-cd/getting_started/#port-forwarding) documentation.

## Setting Admin Password from AWS Secrets Manager

```typescript
const argoCDAddOn = new ArgoCDAddOn({
    adminPasswordSecretName: `your-secret-name`
});
const addOns: Array<ClusterAddOn> = [ argoCDAddOn ];
```

The attribute `adminPasswordSecretName` is the logical name of the secret in [AWS Secret Manager](https://aws.amazon.com/secrets-manager/). Note, that when deploying to multiple regions, the secret is expected to be replicated to each region. 

Inside ArgoCD, the admin password is stored as a `bcrypt` hash. This step will be performed by the framework and stored in the ArgoCD admin `secret`. 

You can change the admin password through the Secrets Manager, but it will require rerunning the provisioning pipeline. Automatic sync with the Secrets Manager will be added in the future. 

## Bootstrapping 

The SSP framework provides an approach to bootstrap workloads and/or additional add-ons from a customer GitOps repository. In a general case, the bootstrap GitOps repository may contains an [App of Apps](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) that points to all workloads and add-ons.  

In order to enable bootstrapping, the add-on allows passing an `ArgoApplicationRepository` at construction time. The following repository types are supported at present:

1. Public HTTP/HTTPS repositories (e.g., GitHub)
2. Private HTTPS accessible git repositories requiring username/password authentication.
3. Private git repositories with SSH access requiring an SSH key for authentication.
4. Private HTTPS accessible GitHub repositories accessible with GitHub token. 

The usage example is provided below, along with an approach that could use a separate app of apps to bootstrap workloads in different stages, which is important for a software delivery platform as it allows segregating workloads specific to each stage of the SDLC and defines clear promotion processes through GitOps.

```typescript
import { ArgoCDAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const addOns = ...;
const gitUrl = 'https://github.com/aws-samples/ssp-eks-workloads.git'

const devBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        repoUrl: gitUrl,
        path: 'envs/dev'
    }
});
const testBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        repoUrl: 'git@github.com:aws-samples/ssp-eks-workloads.git',
        path: 'envs/test',
        credentialsSecretName: 'github-ssh-test',
        credentialsType: 'SSH'
    },

});
const prodBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        repoUrl: 'git@github.com:aws-samples/ssp-eks-workloads.git',
        path: 'envs/prod',
        credentialsSecretName: 'github-ssh-test',
        credentialsType: 'SSH'
    },
    adminPasswordSecretName: 'argo-admin-secret',
});

const east1 = 'us-east-1';
new ssp.EksBlueprint(scope, { id: `${id}-${east1}`, addOns: addOns.concat(devBootstrapArgo), teams }, {
    env: { region: east1 }
});

const east2 = 'us-east-2';
new ssp.EksBlueprint(scope, { id: `${id}-${east2}`, addOns: addOns.concat(testBootstrapArgo), teams }, {
    env: { region: east2 }
});

const west2 = 'us-west-2'
new ssp.EksBlueprint(scope, { id: `${id}-${west2}`, addOns: addOns.concat(prodBootstrapArgo), teams }, {
    env: { region: west2 }
});
```
The application promotion process in the above example is handled entirely through GitOps. Each stage specific App of Apps contains references to respective application GitOps repository for each stage (e.g referencing the release vs work branches or path-based within individual app GitOps repository).

## Known Issues
1. Destruction of the cluster with provisioned applications may cause cloud formation to get stuck on deleting ArgoCD namespace. This happens because the server component that handles Application CRD resource is destroyed before it has a chance to clean up application that were provisioned through GitOps (of which CFN is unaware). To address this issue at the moment, App of Apps application should be destroyed manually before destroying the stack. 
2. Changing the administrator password in the AWS Secrets Manager and rerunning the stack causes login error on ArgoCD UI. This happens due to the fact that Argo Helm rewrites the the secret containing the Dex server API Key (OIDC component of ArgoCD). The workaround at present is to restart the `argocd-server` pod, which repopulates the token. Secret management aspect of ArgoCD will be improved in the future to not require this step after password change. 

## Functionality

1. Creates the namespace specified in the construction parameter (`argocd` by default).
2. Deploys the [`argo-cd`](https://argoproj.github.io/argo-helm) Helm chart into the cluster.
3. Allows to specify `ApplicationRepository` selecting the required authentication method as SSH Key, username/password or username/token. Credentials are expected to be set in AWS Secrets Manager and replicated to the desired region. If bootstrap repository is specified, creates the initial bootstrap application which may be leveraged to bootstrap workloads and/or other add-ons through GitOps.
4. Allows setting the initial admin password through AWS Secrets Manager, replicating to the desired region. 

