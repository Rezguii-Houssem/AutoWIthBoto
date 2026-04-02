variable "cognito_client_id" { type = string }
variable "cognito_issuer" { type = string }

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "AutoWithBoto"
}
