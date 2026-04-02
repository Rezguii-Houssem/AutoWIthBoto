module "iam" {
  source       = "../../modules/iam"
  project_name = var.project_name
}

module "cognito" {
  source       = "../../modules/cognito"
  project_name = var.project_name
}

module "dynamodb" {
  source       = "../../modules/dynamodb"
  project_name = var.project_name
}

module "s3_frontend" {
  source       = "../../modules/s3_frontend"
  project_name = var.project_name
}

module "api_gateway" {
  source            = "../../modules/api_gateway"
  project_name      = var.project_name
  cognito_client_id = module.cognito.client_id
  cognito_issuer    = "https://cognito-idp.${var.region}.amazonaws.com/${module.cognito.user_pool_id}"
}

module "ses" {
  source = "../../modules/ses"
}

module "cloudfront" {
  source                         = "../../modules/cloudfront"
  project_name                   = var.project_name
  s3_bucket_id                   = module.s3_frontend.bucket_id
  s3_bucket_arn                  = module.s3_frontend.bucket_arn
  s3_bucket_regional_domain_name = module.s3_frontend.bucket_regional_domain_name
}

# Lambda Packaging
data "archive_file" "get_idle_ec2" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/finops/get_idle_ec2"
  output_path = "../../builds/get_idle_ec2.zip"
}

data "archive_file" "get_unattached_ebs" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/finops/get_unattached_ebs"
  output_path = "../../builds/get_unattached_ebs.zip"
}

data "archive_file" "check_s3_public" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/secops/check_s3_public"
  output_path = "../../builds/check_s3_public.zip"
}

data "archive_file" "check_sg_open" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/secops/check_sg_open"
  output_path = "../../builds/check_sg_open.zip"
}

data "archive_file" "ses_notifier" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/ses_notifier"
  output_path = "../../builds/ses_notifier.zip"
}

data "archive_file" "toggle_scheduler" {
  type        = "zip"
  source_dir  = "../../../backend/lambdas/toggle_scheduler"
  output_path = "../../builds/toggle_scheduler.zip"
}

# Scan Lambdas
module "get_idle_ec2" {
  source                = "../../modules/lambda"
  function_name         = "getIdleEC2"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /finops/ec2/idle"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {}
  filename              = data.archive_file.get_idle_ec2.output_path
  source_code_hash      = data.archive_file.get_idle_ec2.output_base64sha256
}

module "get_unattached_ebs" {
  source                = "../../modules/lambda"
  function_name         = "getUnattachedEBS"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /finops/ebs/unattached"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {}
  filename              = data.archive_file.get_unattached_ebs.output_path
  source_code_hash      = data.archive_file.get_unattached_ebs.output_base64sha256
}

module "check_s3_public" {
  source                = "../../modules/lambda"
  function_name         = "checkS3Public"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /secops/s3"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {}
  filename              = data.archive_file.check_s3_public.output_path
  source_code_hash      = data.archive_file.check_s3_public.output_base64sha256
}

module "check_sg_open" {
  source                = "../../modules/lambda"
  function_name         = "checkSGOpen"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /secops/sg"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {}
  filename              = data.archive_file.check_sg_open.output_path
  source_code_hash      = data.archive_file.check_sg_open.output_base64sha256
}

# Orchestration & Automation Lambdas
module "ses_notifier" {
  source                = "../../modules/lambda"
  function_name         = "sesNotifier"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "POST /automation/scan/manual"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {}
  filename              = data.archive_file.ses_notifier.output_path
  source_code_hash      = data.archive_file.ses_notifier.output_base64sha256
}

module "toggle_scheduler" {
  source                = "../../modules/lambda"
  function_name         = "toggleScheduler"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "POST /automation/scheduler/toggle"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    RULE_NAME = module.automation.rule_name
  }
  filename         = data.archive_file.toggle_scheduler.output_path
  source_code_hash = data.archive_file.toggle_scheduler.output_base64sha256
}

module "automation" {
  source               = "../../modules/automation"
  project_name         = var.project_name
  notifier_lambda_arn  = module.ses_notifier.lambda_arn
  notifier_lambda_name = module.ses_notifier.lambda_name
}

# Output CloudFront URL
output "cloudfront_url" {
  value = "https://${module.cloudfront.cloudfront_domain_name}"
}
