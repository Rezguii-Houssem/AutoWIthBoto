resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project_name}_lambda_policy"
  description = "Policies for FinOps and SecOps scans"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # EC2 - FinOps (Resource cleanup)
          "ec2:DescribeInstances",
          "ec2:StopInstances",
          "ec2:DescribeVolumes",
          "ec2:DeleteVolume",
          # EC2 - SecOps (Security Group scan)
          "ec2:DescribeSecurityGroups",
          "ec2:RevokeSecurityGroupIngress",
          # CloudWatch - Metrics
          "cloudwatch:GetMetricStatistics",
          # S3 - SecOps & Logging
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPublicAccessBlock",
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:ListAllMyBuckets",
          "s3:PutObject",
          # DynamoDB - State tracking
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          # SES - Alerts
          "ses:SendEmail",
          "lambda:InvokeFunction",
          # EventBridge - Schedules
          "events:PutRule",
          "events:DeleteRule",
          "events:PutTargets",
          "events:RemoveTargets",
          "events:EnableRule",
          "events:DisableRule",
          "events:ListRules",
          "events:ListTargetsByRule",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          # Cost Explorer & Tagging (Least Privilege)
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "tag:GetResources",
          "tag:GetTagKeys",
          "tag:GetTagValues",
          # Logging
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })

}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}
