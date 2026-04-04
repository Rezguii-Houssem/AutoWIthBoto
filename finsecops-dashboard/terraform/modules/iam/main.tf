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
          "ec2:DescribeInstances",
          "ec2:StopInstances",
          "ec2:DescribeVolumes",
          "ec2:DeleteVolume",
          "cloudwatch:GetMetricStatistics",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "s3:PutObject",
          "ses:SendEmail",
          "lambda:InvokeFunction",
          "events:EnableRule",
          "events:DisableRule",
          "ce:GetCostAndUsageWithResources",
          "ce:GetCostAndUsage",
          "tag:GetResources"
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
