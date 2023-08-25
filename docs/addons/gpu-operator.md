# NVIDIA GPU-Operator Add-on

Configuring and managing nodes with NVIDIA GPUs requires configuration of multiple software components such as drivers, container runtimes or other libraries which is difficult and error-prone.
The [gpu-operator](https://github.com/NVIDIA/gpu-operator) automates the management of all NVIDIA software components needed to provision GPU. These components include the NVIDIA drivers (to enable CUDA), Kubernetes device plugin for GPUs, the NVIDIA Container Runtime, automatic node labelling, DCGM based monitoring and others. The GPU Operator allows administrators of Kubernetes clusters to manage GPU nodes just like CPU nodes in the cluster. Instead of provisioning a special OS image for GPU nodes, administrators can rely on a standard OS image for both CPU and GPU nodes and then rely on the GPU Operator to provision the required software components for GPUs.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.GpuOperatorAddon(),

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you.

- `values`: Arbitrary values to pass to the chart. Refer to the GPU Operator [Chart Customization Options](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/getting-started.html#chart-customization-options) for additional details. It also supports all [standard helm configuration options](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that Grafana Operator is installed properly in the cluster, check if the namespace is created and pods are running.

Verify if the namespace is created correctly
```bash
kubectl get ns | grep "gpu-operator"
```
There should be list the gpu-operator namespace
```bash
gpu-operator         Active   8h
```
Verify if everything is running correctly in the gpu-operator namespace
```bash
kubectl get all -n gpu-operator  
```
This should list 3 service i.e. gpu-operator, node feature discovery and dcgm exporter, 2 deployment, and 2 replica-set starting with name grafana-operator 
For Eg:
```bash
NAME                                                                  READY   STATUS      RESTARTS   AGE
pod/gpu-feature-discovery-z46kh                                       1/1     Running     0          8h
pod/gpu-operator-5f9dfcb867-ccwm5                                     1/1     Running     0          8h
pod/nvidia-container-toolkit-daemonset-nrb2d                          1/1     Running     0          8h
pod/nvidia-cuda-validator-ln9mf                                       0/1     Completed   0          8h
pod/nvidia-dcgm-exporter-p9n2w                                        1/1     Running     0          8h
pod/nvidia-device-plugin-daemonset-lwbb7                              1/1     Running     0          8h
pod/nvidia-device-plugin-validator-rlh86                              0/1     Completed   0          8h
pod/nvidia-gpu-operator-node-feature-discovery-master-6fb7d9469w4hw   1/1     Running     0          8h
pod/nvidia-gpu-operator-node-feature-discovery-worker-82b48           1/1     Running     0          8h
pod/nvidia-operator-validator-5b7j2                                   1/1     Running     0          8h

NAME                                                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/gpu-operator                                        ClusterIP   172.20.181.207   <none>        8080/TCP   8h
service/nvidia-dcgm-exporter                                ClusterIP   172.20.81.118    <none>        9400/TCP   8h
service/nvidia-gpu-operator-node-feature-discovery-master   ClusterIP   172.20.198.97    <none>        8080/TCP   8h

NAME                                                               DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                                      AGE
daemonset.apps/gpu-feature-discovery                               1         1         1       1            1           nvidia.com/gpu.deploy.gpu-feature-discovery=true   8h
daemonset.apps/nvidia-container-toolkit-daemonset                  1         1         1       1            1           nvidia.com/gpu.deploy.container-toolkit=true       8h
daemonset.apps/nvidia-dcgm-exporter                                1         1         1       1            1           nvidia.com/gpu.deploy.dcgm-exporter=true           8h
daemonset.apps/nvidia-device-plugin-daemonset                      1         1         1       1            1           nvidia.com/gpu.deploy.device-plugin=true           8h
daemonset.apps/nvidia-driver-daemonset                             0         0         0       0            0           nvidia.com/gpu.deploy.driver=true                  8h
daemonset.apps/nvidia-gpu-operator-node-feature-discovery-worker   1         1         1       1            1           <none>                                             8h
daemonset.apps/nvidia-mig-manager                                  0         0         0       0            0           nvidia.com/gpu.deploy.mig-manager=true             8h
daemonset.apps/nvidia-operator-validator                           1         1         1       1            1           nvidia.com/gpu.deploy.operator-validator=true      8h

NAME                                                                READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/gpu-operator                                        1/1     1            1           8h
deployment.apps/nvidia-gpu-operator-node-feature-discovery-master   1/1     1            1           8h

NAME                                                                           DESIRED   CURRENT   READY   AGE
replicaset.apps/gpu-operator-5f9dfcb867                                        1         1         1       8h
replicaset.apps/nvidia-gpu-operator-node-feature-discovery-master-6fb7d94695   1         1         1       8h
```

## Testing

