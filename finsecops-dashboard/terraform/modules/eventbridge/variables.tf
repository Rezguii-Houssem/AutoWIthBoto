variable "lambda_arn" {
  description = "ARN of the Lambda to trigger"
  type        = string
}

variable "lambda_name" {
  description = "Name of the Lambda to trigger"
  type        = string
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "autowithboto"
}
