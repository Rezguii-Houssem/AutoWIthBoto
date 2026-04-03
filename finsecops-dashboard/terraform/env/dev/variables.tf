variable "region" {
  type    = string
  default = "eu-west-3"
}

variable "project_name" {
  type    = string
  default = "autowithboto"
}

variable "google_client_id" {
  type      = string
  default   = ""
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}
