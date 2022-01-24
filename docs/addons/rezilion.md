# Rezilion Addon

The `Rezilion Addon` adds support for Rezilion Validate for EKS clusters.

Rezilion Validate reduces patching needs by 70% or more by aggregating vulnerability scan results and automatically 
filtering them to focus on what’s actually loaded and exploitable.

Installing the `Rezilion Addon` adds a DaemonSet to your cluster that runs the Rezilion Agent in a container. The agent
can then monitor other containers in the cluster and generate reports providing validation information.  


## Prerequisite
You need to have a Rezilion account, and your account API key available to run this addon.


## Usage

```typescript
import { RezilionAddOn } from '@rezilion/rezilion-ssp-addon';

const Rezilion = new RezilionAddOn("<your_api_key>");

EksBlueprint.builder()
    .addOns(Rezilion)
    .build(scope, "<stack_id");
```

# Validation
To validate that the Rezilion Addon is running, ensure that the Rezilion pod is in a running state.


```bash
$ kubectl get pod -n default
NAME                    READY   STATUS    RESTARTS   AGE
rezilion-hermes-8dcpw   1/1     Running   0          10s
```
 