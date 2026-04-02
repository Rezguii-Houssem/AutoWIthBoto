variable "project_name" {
  description = "Project name"
  type        = "string"
}

variable "notifier_lambda_arn" {
  description = "ARN of the notifier Lambda function"
  type        = "string"
}

variable "notifier_lambda_name" {
  description = "Name of the notifier Lambda function"
  type        = "string"
}

variable "schedule_expression" {
  description = "Cron expression for the daily scan"
  type        = "string"
  default     = "rate(1 day)"
}
