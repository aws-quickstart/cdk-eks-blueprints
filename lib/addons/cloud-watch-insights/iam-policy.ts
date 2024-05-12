import {PolicyDocument, PolicyStatement} from "aws-cdk-lib/aws-iam";

export function ebsCollectorPolicy(): PolicyDocument {
  return new PolicyDocument({
    statements: [
      new PolicyStatement({
        actions: [
          'ec2:DescribeVolumes',
        ],
        resources: ['*']
      })
    ]
  });
}

