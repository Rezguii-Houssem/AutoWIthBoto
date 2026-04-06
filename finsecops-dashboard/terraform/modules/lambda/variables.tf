variable "function_name" {
  type = string
}

variable "handler" {
  type = string
}

variable "role_arn" {
  type = string
}

variable "runtime" {
  type    = string
  default = "python3.11"
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "api_id" {
  type = string
}

variable "route_key" {
  type    = string
  default = ""
}

variable "route_keys" {
  type    = list(string)
  default = []
}

variable "authorizer_id" {
  type = string
}

variable "filename" {
  type        = string
  description = "Path to the lambda zip file"
}

variable "source_code_hash" {
  type        = string
  description = "Base64 encoded SHA256 hash of the zip file"
  default     = null
}
