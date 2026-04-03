variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "autowithboto"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
}

variable "callback_urls" {
  description = "List of allowed callback URLs for the identity providers"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://d18k6ix2vzcqik.cloudfront.net/authorize2identity_provider"]
}

variable "logout_urls" {
  description = "List of allowed logout URLs for the identity providers"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://d18k6ix2vzcqik.cloudfront.net/authorize2identity_provider"]
}
