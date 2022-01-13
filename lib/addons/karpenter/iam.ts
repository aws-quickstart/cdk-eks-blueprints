export const KarpenterControllerPolicy = {
  "Version": "2012-10-17",
  "Statement": [
      {
          "Effect": "Allow",
          "Action": [
              "ec2:CreateLaunchTemplate",
              "ec2:CreateFleet",
              "ec2:RunInstances",
              "ec2:CreateTags",
              "iam:PassRole",
              "ec2:TerminateInstances",
              "ec2:DescribeLaunchTemplates",
              "ec2:DescribeInstances",
              "ec2:DescribeSecurityGroups",
              "ec2:DescribeSubnets",
              "ec2:DescribeInstanceTypes",
              "ec2:DescribeInstanceTypeOfferings",
              "ec2:DescribeAvailabilityZones",
              "ssm:GetParameter",
          ],
          "Resource": "*"
      }
  ]
};