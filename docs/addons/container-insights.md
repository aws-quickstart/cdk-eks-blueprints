# Container Insights Add-on

//TODO Again, seems recursive: ContainerInsights supports Container Insights?
The `ContainerInsights` add-on provides support for [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html) to an Amazon EKS cluster.

Use Container Insights to collect, aggregate, and summarize metrics and logs from your containerized applications and microservices. Container Insights collects data as performance-log events using an embedded metric format. These events are entries that use a structured JSON schema that enables high-cardinality data to be ingested and stored at scale. Amazon CloudWatch creates aggregated reports from the data as metrics at the cluster, node, pod, task, and service level. The metrics are available in CloudWatch dashboards and viewable in the **Metrics** section of the CloudWatch console.

**IMPORTANT**
Metrics that are collected by Container Insights are charged as custom metrics. Amazon CloudWatch does not automatically create all possible metrics from the log data. To help you manage the costs of your Container Insights, review additional metrics and levels of granularity by using Amazon CloudWatch Logs Insights. For more information, see [Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).

## Usage

Add Containers Insights to your cluster by using the `main.ts` add-on: 

```typescript
import { AddOns }  from '@shapirov/cdk-eks-blueprint';

const myClusterAutoscaler = new AddOns.ContainerInsightsAddOn();
const addOns: Array<ClusterAddOn> = [ myClusterAutoscaler ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

To update your CDK stack, run `cdk deploy`. 

## Prerequisites

With Container Insights installed, use `kubectl get all -n amazon-cloudwatch` to verify that the CloudWatch agent and FluentD daemons are running:
```
NAME                           READY   STATUS    RESTARTS   AGE
pod/cloudwatch-agent-k8wxl     1/1     Running   0          105s
pod/fluentd-cloudwatch-78zv4   1/1     Running   0          105s

NAME                                DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/cloudwatch-agent     1         1         1       1            1           <none>          107s
daemonset.apps/fluentd-cloudwatch   1         1         1       1            1           <none>          106s
```
//TODO The formatting here seems off. Is "aws eks ..." the first command?
To enable or disable control-plane logs, run the following command from your terminal - `aws eks update-cluster-config \
    --region us-east-2 \
    --name east-dev \
    --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'`

The following is an example of the output:
```json
{
    "update": {
        "id": "<883405c8-65c6-4758-8cee-2a7c1340a6d9>",
        "status": "InProgress",
        "type": "LoggingUpdate",
        "params": [
            {
                "type": "ClusterLogging",
                "value": "{\"clusterLogging\":[{\"types\":[\"api\",\"audit\",\"authenticator\",\"controllerManager\",\"scheduler\"],\"enabled\":true}]}"
            }
        ],
        "createdAt": 1553271814.684,
        "errors": []
    }
}
```
//TODO Ditto, as above:
To monitor the status of your log-configuration update to your cluster, run the following command - `aws eks describe-update \
    --region <region-code>\
    --name <prod> \
    --update-id <883405c8-65c6-4758-8cee-2a7c1340a6d9>`

The following is an example of the output for when the update completes: 

```json
{
    "update": {
        "id": "<883405c8-65c6-4758-8cee-2a7c1340a6d9>",
        "status": "Successful",
        "type": "LoggingUpdate",
        "params": [
            {
                "type": "ClusterLogging",
                "value": "{\"clusterLogging\":[{\"types\":[\"api\",\"audit\",\"authenticator\",\"controllerManager\",\"scheduler\"],\"enabled\":true}]}"
            }
        ],
        "createdAt": 1553271814.684,
        "errors": []
    }
}
```

## View metrics for cluster and workloads
Under **Performance Monitoring**, view cluster and workload metrics. Choose **EKS Pods and Clusters** to view the utilization of your CPU and memory along with other important metrics, such as network performance. 
![CloudWatch](../assets/screenshots/eks-blueprint-cwinsights-performance-monitoring.png)

## View cluster level logs
After you enable any of the control-plane log types for your Amazon EKS cluster, view the logs on the Amazon CloudWatch console:

1. Navigate to the CloudWatch console, and choose the cluster that you want to view logs for. The format of the log-group name is `/aws/eks/<cluster-name>/cluster`.
2. Choose the log stream to view. The following list describes the format of the log-stream name for each log type.
   1. Kubernetes API server component logs (api): kube-apiserver-<nnn...>
   2. Audit (audit): kube-apiserver-audit-<nnn...>
   3. Authenticator (authenticator): authenticator-<nnn...>
   4. Controller manager (controllerManager): kube-controller-manager-<nnn...>
   5. Scheduler (scheduler): kube-scheduler-<nnn...>

To view all of the log streams from your Amazon EKS control plane, under **Logs**, choose **Log groups**. 

![CloudWatch](../assets/screenshots/eks-blueprint-cwlogs.png)


## View workload level logs

To view workload-level logs, navigate to the AWS CloudWatch Logs Insights console, and follow these steps: 

1. In the navigation pane, choose **Insights**.
2. Near the top of the screen is the query editor. When you first open Amazon CloudWatch Logs Insights, this box contains a default query that returns the 20 most recent log events.
3. In the box above the query editor, select one of the Container Insights log groups to query. For the following example queries to work, the log-group name must end with `performance` (e.g., `/aws/containerinsights/east-dev/performance`).
4. When you select a log group, CloudWatch Logs Insights detects fields in the data in the log group and displays them in **Discovered** fields in the right-hand pane. It also displays a bar graph of log events in this log group over time. The bar graph shows the distribution of events in the log group that matches your query and time range (not only the events displayed in the table).

In the query editor, replace the default query with the following query, and choose **Run query**.

STATS avg(node_cpu_utilization) as avg_node_cpu_utilization by NodeName
`SORT avg_node_cpu_utilization DESC`
This query shows a list of nodes, sorted by average node CPU utilization. Below is an example of what the visualization should look like.

![CloudWatch](../assets/screenshots/eks-blueprint-cloudwatch-loginsights.png)

To try another example, replace that query with another query, and choose **Run query**. More sample queries are listed later on this page.

STATS avg(number_of_container_restarts) as avg_number_of_container_restarts by PodName
`SORT avg_number_of_container_restarts DESC`
This query displays a list of your pods, sorted by the average number of container restarts:

![CloudWatch](../assets/screenshots/eks-blueprint-cloudwatch-loginsights-2.png)

To try another query, use the **Include** fields in the list at the right of the screen. For more information, see [CloudWatch Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html).

## View containers through the container map in Container Insights

To view a map of all of the containers running inside your cluster, choose **View your container map** from the **Container Insights** tab. It provides a map of your namespaces and their associated pods and services.

![CloudWatch](../assets/screenshots/eks-blueprint-container-insights.png)