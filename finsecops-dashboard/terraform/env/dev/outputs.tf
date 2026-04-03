output "api_gateway_url" {
  value = module.api_gateway.api_endpoint
}

output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "cognito_domain" {
  value = module.cognito.cognito_domain
}

output "s3_frontend_bucket_id" {
  value = module.s3_frontend.bucket_id
}

output "cloudfront_url" {
  value = "https://${module.cloudfront.cloudfront_domain_name}"
}

output "s3_website_url" {
  value = module.s3_frontend.website_endpoint
}
