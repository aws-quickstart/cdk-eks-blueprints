# Argo CD Add-on

[Argo CD](https://argoproj.github.io/argo-cd/) is a declarative, GitOps continuous delivery tool for Kubernetes. The Argo CD add-on provisions [Argo CD](https://argoproj.github.io/argo-cd/) into an EKS cluster, and can optionally bootstrap your workloads from public and private Git repositories. 

The Argo CD add-on allows platform administrators to combine cluster provisioning and workload bootstrapping in a single step and enables use cases such as replicating an existing running production cluster in a different region in a matter of minutes. This is important for business continuity and disaster recovery cases as well as for cross-regional availability and geographical expansion.

Please see the documentation below for details on automatic boostrapping with ArgoCD add-on. If you prefer manual bootstrapping (once your cluster is deployed with this add-on included), you can find instructions on getting started with Argo CD in our [Getting Started](/getting-started/#deploy-workloads-with-argocd) guide.

Full Argo CD project documentation [can be found here](https://argoproj.github.io/argo-cd/).

## Usage

To provision and maintain ArgoCD components without any bootstrapping, the add-on provides a no-argument constructor to get started. 

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.ArgoCDAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

The above will create an `argocd` namespace and install all Argo CD components. In order to bootstrap workloads you will need to change the default ArgoCD admin password and add repositories as specified in the [Getting Started](https://argoproj.github.io/argo-cd/getting_started/#port-forwarding) documentation.

## Functionality

1. Creates the namespace specified in the construction parameter (`argocd` by default).
2. Deploys the [`argo-cd`](https://argoproj.github.io/argo-helm) Helm chart into the cluster.
3. Allows to specify `ApplicationRepository` selecting the required authentication method as SSH Key, username/password or username/token. Credentials are expected to be set in AWS Secrets Manager and replicated to the desired region. If bootstrap repository is specified, creates the initial bootstrap application which may be leveraged to bootstrap workloads and/or other add-ons through GitOps.
4. Allows setting the initial admin password through AWS Secrets Manager, replicating to the desired region. 
5. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

## Setting an Admin Password

By default, the Argo CD add-on will create a new admin password for you. To specify your own, you can leverage the AWS Secrets Manager.

```typescript
const argoCDAddOn = new ArgoCDAddOn({
    adminPasswordSecretName: `your-secret-name`
});
const addOns: Array<ClusterAddOn> = [ argoCDAddOn ];
```

The attribute `adminPasswordSecretName` is the logical name of the secret in [AWS Secret Manager](https://aws.amazon.com/secrets-manager/). Note, that when deploying to multiple regions, the secret is expected to be replicated to each region. 

Inside ArgoCD, the admin password is stored as a `bcrypt` hash. This step will be performed by the framework and stored in the ArgoCD admin `secret`. 

You can change the admin password through the Secrets Manager, but it will require rerunning the provisioning pipeline to apply the change. 

## Bootstrapping 

The Blueprints framework provides an approach to bootstrap workloads and/or additional add-ons from a customer GitOps repository. In a general case, the bootstrap GitOps repository may contains an [App of Apps](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) that points to all workloads and add-ons.  

In order to enable bootstrapping, the add-on allows passing an `ApplicationRepository` at construction time. The following repository types are supported at present:

1. Public HTTP/HTTPS repositories (e.g., GitHub)
2. Private HTTPS accessible git repositories requiring username/password authentication.
3. Private git repositories with SSH access requiring an SSH key for authentication.
4. Private HTTPS accessible GitHub repositories accessible with GitHub token. 

An example is provided below, along with an approach that could use a separate app of apps to bootstrap workloads in different stages, which is important for a software delivery platform as it allows segregating workloads specific to each stage of the SDLC and defines clear promotion processes through GitOps.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ArgoCDAddOn, ClusterAddOn, EksBlueprint, ApplicationRepository }  from '@aws-quickstart/eks-blueprints';

const secretStoreAddOn = new SecretsStoreAddOn();
const repoUrl = 'git@github.com:aws-samples/eks-blueprints-workloads.git'

const bootstrapRepo: ApplicationRepository = {
    repoUrl,
    credentialsSecretName: 'github-ssh-test',
    credentialsType: 'SSH'
}

const devBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        ...bootstrapRepo,
        path: 'envs/dev'
    }
});
const testBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        ...bootstrapRepo,
        path: 'envs/test',
    },

});
const prodBootstrapArgo = new ArgoCDAddOn({
    bootstrapRepo: {
        ...bootstrapRepo,
        path: 'envs/prod',
    },
    adminPasswordSecretName: 'ArgoCDAdmin',
});

const blueprint = EksBlueprint.builder()
    .addOns(secretStoreAddOn)
    .account(account);

blueprint.clone('us-east-1')
    .addOns(devBootstrapArgo)
    .build(app, 'argo-us-east-1');

blueprint.clone('us-east-2')
    .addOns(testBootstrapArgo)
    .build(app, 'argo-us-east-2');

blueprint.clone('us-west-2')
    .addOns(prodBootstrapArgo)
    .build(app, 'argo-us-west-1');
```

The application promotion process in the above example is handled entirely through GitOps. Each stage specific App of Apps contains references to respective application GitOps repository for each stage (e.g referencing the release vs work branches or path-based within individual app GitOps repository).

## Secrets Support

The framework provides support to supply repository and administrator secrets in AWS Secrets Manager. This support is evolving and will be improved over time as ArgoCD itself matures. 

### Private Repositories

**SSH Key Authentication**

1. Set `credentialsType` to `SSH` when defining bootstrap repository in the ArgoCD add-on configuration.

```typescript
.addOns(new blueprints.addons.ArgoCDAddOn({
    bootstrapRepo: {
        repoUrl: 'git@github.com:aws-samples/eks-blueprints-workloads.git',
        path: 'envs/dev',
        credentialsSecretName: 'github-ssh-json',
        credentialsType: 'SSH'
    }
}))
```

*Note:* In this case the configuration assumes that there is a secret `github-ssh-json` define in the target account and all the regions where the blueprint will be deployed. 

2. Define the secret in AWS Secret Manager as "Plain Text" that contains a JSON structure (as of ArgoCD 2.x) with the fields `sshPrivateKey` and `url` defined. Note, that JSON does not allow line break characters, so all new line characters must be escaped with `\n`.

Example Structure:
```json
{
    "sshPrivateKey": "-----BEGIN THIS IS NOT A REAL PRIVATE KEY-----\nb3BlbnNzaC1rtdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAgEAy82zTTDStK+s0dnaYzE7vLSAcwsiHM8gN\nhq2p5TfcjCcYUWetyu6e/xx5Rh+AwbVvDV5h9QyMw4NJobwuj5PBnhkc3QfwJAO5wOnl7R\nGbehIleWWZLs9qq`DufViQsa0fDwP6JCrqD14aIozg6sJ0Oqi7vQkV+jR0ht/\nuFO1ANXBn2ih0ZpXeHSbPDLeZQjlOBrbGytnCbdvLtfGEsV0WO2oIieWVXJj/zzpKuMmrr\nebPsfwr36nLprOQV6IhDDo\n-----END NOT A REAL PRIVATE KEY-----\n",

    "url": "git@github"
}
```
**Note:**  You can notice explicit `\n` characters in the `sshPrivateKey`.

**url** attribute is required and must specify full or partial URL for credentials template. For example `git@github` will set the credentials for all GitHub repositories when SSH authentication is used.  For more information see [Repository Credentials](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#repository-credentials) and [SSH Repositories](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#ssh-repositories) from official ArgoCD documentation.

To escape your SSH private key for storing it as a secret you can use the following command on Mac/Linux:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}'  <path-to-your-cert>
```

A convenience script to create the JSON structure for SSH private key can be found [here](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/scripts/create-argocd-ssh-secret.sh). You will need to set the `PEM_FILE`(full path to the ssh private key file) and `URL_TEMPLATE` (part of the URL for credentials template) variables inside the script.

3. (**important**) Replicate the secret to all the desired regions. 
4. Please see [instructions for GitHub](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh) oou n details on setting up SSH access.


**Username Password and Token Authentication** 

1. Set `credentialsType` to `USERNAME` or `TOKEN` when defining `ApplicationRepository` in the ArgoCD add-on configuration.
2. Define the secret in the AWS Secret Manager as "Key Value" and set fields `url`, `username` and `password` to the desired values (clear text). For `TOKEN` username could be set to any username and password field set to the GitHub token. Replicate to the desired regions.
3. Make sure that for this type of authentication your repository URL is set as `https`, e.g. https://github.com/aws-samples/eks-blueprints-workloads.git.

Example Structure for `USERNAME` and `TOKEN` authentication type:
```json
{
    "username": "YOUR_GIT_USERNAME", 
    "password": "YOUR PASSWORD OR TOKEN",
    "url": "https://github.com/aws-samples"
}
```

Note: `url` value can be a path to the org, rather than an actual repository.  

**Admin Secret**

1. Create a secret in the AWS Secrets Manager as "Plain Text" and set the value to the desired ArgoCD admin password. 
2. Replicate the secret to all the desired regions.
3. Set the secret name in `adminPasswordSecretName` in ArgoCD add-on configuration.
4. You can change the secret value through AWS Secrets Manager, however, it will require to rerun `cdk deploy` with the minimal changeset to apply the change. 

Alternatively to get started, the admin password hash can be set bypassing the AWS Secret by setting the following structure in the values properties of the add-on parameters:

```typescript
import * as bcrypt from "bcrypt";

.addOns(new blueprints.addons.ArgoCDAddOn({
         ... // other settings
         values: {
           "configs": {
                "secret": {
                    "argocdServerAdminPassword": bcrypt.hash(<your password plain text>, 10) // or just supply <your bcrypt hash> directly
                }
            }
        }
     }))
```

For more information, please refer to the [ArgoCD official documentation](https://github.com/argoproj/argo-helm/tree/master/charts/argo-cd).
## Known Issues

1. Destruction of the cluster with provisioned applications may cause cloud formation to get stuck on deleting ArgoCD namespace. This happens because the server component that handles Application CRD resource is destroyed before it has a chance to clean up applications that were provisioned through GitOps (of which CFN is unaware). To address this issue at the moment, App of Apps application should be destroyed manually before destroying the stack. 

2. Changing the administrator password in the AWS Secrets Manager and rerunning the stack causes login error on ArgoCD UI. This happens due to the fact that Argo Helm rewrites the secret containing the Dex server API Key (OIDC component of ArgoCD). The workaround at present is to restart the `argocd-server` pod, which repopulates the token. Secret management aspect of ArgoCD will be improved in the future to not require this step after password change. 

## Troubleshooting

1. Dex Server crashing on startup with `server.secretkey is missing`. 

It may be a byproduct of another failure. As a rule (unless ArgoCD secret is configured separately) the initial start of the ArgoCD server should populate a few fields in the in [ArgoCD secret](https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-secret.yaml). If ArgoCD server fails to start or is waiting on some condition to become ready, these fields are not populated, causing cascading failures. 

Make sure that all the secrets are mounted properly onto the ArgoCD server pod. It can be caused by an incorrect shape of the secret for private repositories (see "Private Repositories" section above). SSH secret is expected to have two fields (`url` and `sshPrivateKey`) and USERNAME/TOKEN is expected to have three fields (`username`, `password`, `url`).

Make sure your secret name (as defined in AWS Secrets Manager) does not conflict with ArgoCD reserved secret names, such as `argocd-secret`.

