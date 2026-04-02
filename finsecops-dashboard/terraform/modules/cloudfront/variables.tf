variable "project_name" {
  description = "Project name"
  type        = string
}

variable "s3_bucket_id" {
  description = "ID of the S3 bucket for the frontend"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for the frontend"
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  type        = string
}
