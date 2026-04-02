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
  type = string
}

variable "authorizer_id" {
  type = string
}
