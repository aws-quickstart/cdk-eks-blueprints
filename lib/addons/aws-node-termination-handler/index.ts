import { Construct, Duration } from '@aws-cdk/core';
import { ClusterInfo } from '../../spi';
import { LifecycleTransition, LifecycleHook } from '@aws-cdk/aws-autoscaling';
import { Queue } from '@aws-cdk/aws-sqs';
import { QueueHook } from '@aws-cdk/aws-autoscaling-hooktargets';
import * as iam from '@aws-cdk/aws-iam';
import { AwsCustomResource, PhysicalResourceId, AwsCustomResourcePolicy, AwsSdkCall } from '@aws-cdk/custom-resources';
import { Rule, EventPattern } from '@aws-cdk/aws-events';
import { SqsQueue } from '@aws-cdk/aws-events-targets';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

/**
 * Configuration for the add-on
 */
type AwsNodeTerminationHandlerProps = HelmAddOnUserProps;

/**
 * Default options for the add-on
 */
const defaultProps: HelmAddOnProps = {
  chart: 'aws-node-termination-handler',
  repository: 'https://aws.github.io/eks-charts',
  version: '0.16.0',
  release: 'ssp-addon-aws-node-termination-handler',
  name: 'aws-node-termination-handler',
  namespace: 'kube-system'
};

export class AwsNodeTerminationHandlerAddOn extends HelmAddOn {

  private options: AwsNodeTerminationHandlerProps;

  constructor(props?: AwsNodeTerminationHandlerProps) {
    super({ ...defaultProps, ...props });
    this.options = this.props;
  }

  /**
   * Implementation of the deploy interface
   * @param clusterInfo 
   */
  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;    
    const asgCapacity = clusterInfo.autoScalingGroup;

    // No support for Fargate and Managed Node Groups, lets catch that
    console.assert(asgCapacity, 'AWS Node Termination Handler is only supported for self-managed nodes');

    // Create an SQS Queue
    if (asgCapacity) {
      const queue = new Queue(cluster.stack, `aws-nth-queue`, {
        retentionPeriod: Duration.minutes(5)
      });
      queue.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ServicePrincipal('events.amazonaws.com'),
          new iam.ServicePrincipal('sqs.amazonaws.com'),
        ],
        actions: ['sqs:SendMessage'],
        resources: [queue.queueArn]
      }));

      // Setup a Termination Lifecycle Hook on an ASG
      new LifecycleHook(cluster.stack, `aws-nth-lifecycle-hook`, {
        lifecycleTransition: LifecycleTransition.INSTANCE_TERMINATING,
        heartbeatTimeout: Duration.minutes(15),
        notificationTarget: new QueueHook(queue),
        autoScalingGroup: asgCapacity!
      });

      // Tag the ASG
      this.tagAsg(cluster.stack, asgCapacity!.autoScalingGroupName);

      // Create Amazon EventBridge Rules
      this.createEvents(cluster.stack, queue);

      // Create Service Account
      const serviceAccount = cluster.addServiceAccount('aws-nth-sa', {
        name: 'aws-node-termination-handler-sa',
        namespace: this.options.namespace,
      });
      serviceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'autoscaling:CompleteLifecycleAction',
          'autoscaling:DescribeAutoScalingInstances',
          'autoscaling:DescribeTags'
        ],
        resources: [asgCapacity!.autoScalingGroupArn]
      }));
      serviceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ec2:DescribeInstances'],
        resources: ['*']
      }));
      queue.grantConsumeMessages(serviceAccount);

      // Deploy the helm chart
      const awsNodeTerminationHandlerChart = this.addHelmChart(clusterInfo, {
        enableSqsTerminationDraining: true,
        queueURL: queue.queueUrl,
        serviceAccount: {
          create: false,
          name: serviceAccount.serviceAccountName,
        },
        enablePrometheusServer: true
      });
      awsNodeTerminationHandlerChart.node.addDependency(serviceAccount);
    }
  }

  /**
   * Creates the node termination tag for the ASG
   * @param scope
   * @param autoScalingGroup 
   */
  private tagAsg(scope: Construct, autoScalingGroup: string): void {
    const callProps: AwsSdkCall = {
      service: 'AutoScaling',
      action: 'createOrUpdateTags',
      parameters: {
        Tags: [
          {
            Key: 'aws-node-termination-handler/managed',
            Value: 'true',
            PropagateAtLaunch : true,
            ResourceId: autoScalingGroup,
            ResourceType: 'auto-scaling-group'
          }
        ]
      },
      physicalResourceId: PhysicalResourceId.of(
        `${autoScalingGroup}-asg-tag`
      )
    };
    this.AwsCustomResource(scope, 'asg-tag', callProps);
  }

  /**
   * Creates AWS Custom Resource
   * @param scope 
   * @param id 
   * @param resourceProps 
   * @returns AwsCustomResource
   */
  private AwsCustomResource(scope: Construct, id: string, callProps: AwsSdkCall): AwsCustomResource {
    return new AwsCustomResource(scope, id, {
      onCreate: callProps,
      onUpdate: callProps,
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE
      })
    });
  }

  /**
   * Create EventBridge rules with target as SQS queue
   * @param scope 
   * @param queue 
   */
  private createEvents(scope: Construct, queue: Queue): void {
    const target = new SqsQueue(queue);
    const eventPatterns: EventPattern[] = [
      {
        source: ['aws.autoscaling'],
        detailType: ['EC2 Instance-terminate Lifecycle Action']
      },
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Spot Instance Interruption Warning']
      },
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance Rebalance Recommendation']
      },
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification']
      },
      {
        source: ['aws.health'],
        detailType: ['AWS Health Even'],
      }
    ];

    eventPatterns.forEach((event, index) => {
      const rule = new Rule(scope, `rule-${index}`, { eventPattern: event });
      rule.addTarget(target);
    });
  }
}