# Auto Scaling Group Cluster Provider

The `AsgClusterProvider` allows you to provision an EKS cluster which leverages [EC2 Auto Scaling groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html)(ASGs) for compute capacity. An Auto Scaling group contains a collection of Amazon EC2 instances that are treated as a logical grouping for the purposes of automatic scaling and management.

## Usage 

```typescript
const props: AsgClusterProviderProps = {
    minSize: 1,
    maxSize: 10,
    desiredSize: 4,
    instanceType: new InstanceType('m5.large'),
    machineImageType: eks.MachineImageType.AMAZON_LINUX_2,
    updatePolicy: UpdatePolicy.Rolling
}
const clusterProvider = new blueprints.AsgClusterProvider(props);
new blueprints.EksBlueprint(scope, { id: 'blueprint', [], [], clusterProvider });
```

## Configuration

`AsgClusterProvider` supports the following configuration options. 

| Prop              | Description |
|-------------------|-------------|
| name              | The name for the cluster.
| minSize           | Min cluster size, must be positive integer greater than 0 (default 1).
| maxSize           | Max cluster size, must be greater than minSize (default 3).
| desiredSize       | Desired cluster size, must be greater or equal to minSize (default `min-size`).
| instanceType      | Type of instance for the EKS cluster, must be a valid instance type, i.e. t3.medium (default "m5.large")
| machineImageType  | Machine Image Type for the Autoscaling Group.
| updatePolicy      | Update policy for the Autoscaling Group.
| vpcSubnets        | The subnets for the cluster.
| privateCluster    | If `true` Kubernetes API server is private. 

There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).

Configuration can also be supplied via context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.min-size`
- `eks.default.max-size` 
- `eks.default.desired-size`
- `eks.default.instance-type` 
- `eks.default.private-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass `AsgProviderClusterProps` to each cluster blueprint.

## Bottlerocket ASG

[Bottlerocket](https://aws.amazon.com/bottlerocket/) is a Linux-based open-source operating system that is purpose-built by Amazon Web Services for running containers. Customers can leverage the `AsgClusterProvider` to provision EKS clusters with Bottlerocket nodes. To do so, set the `machineImageType` property to `eks.MachineImageType.BOTTLEROCKET`.

```typescript
const props: AsgClusterProviderProps = {
    minSize: 1,
    maxSize: 10,
    desiredSize: 4,
    instanceType: new InstanceType('m5.large'),
    machineImageType: eks.MachineImageType.BOTTLEROCKET,
    updatePolicy: UpdatePolicy.Rolling
}
const clusterProvider = new blueprints.AsgClusterProvider(props);
new blueprints.EksBlueprint(scope, { id: 'blueprint', teams, addOns, clusterProvider });
```

