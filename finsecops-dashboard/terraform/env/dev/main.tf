module "iam" {
  source       = "../../modules/iam"
  project_name = var.project_name
}

module "cognito" {
  source               = "../../modules/cognito"
  project_name         = var.project_name
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  callback_urls        = ["http://localhost:3000/authorize2identity_provider", "https://${module.cloudfront.cloudfront_domain_name}/authorize2identity_provider", "https://${module.cloudfront.cloudfront_domain_name}/"]
  logout_urls          = ["http://localhost:3000/authorize2identity_provider", "https://${module.cloudfront.cloudfront_domain_name}/authorize2identity_provider", "https://${module.cloudfront.cloudfront_domain_name}/"]
}

module "dynamodb" {
  source       = "../../modules/dynamodb"
  project_name = var.project_name
}

module "s3_frontend" {
  source       = "../../modules/s3_frontend"
  project_name = var.project_name
}

module "s3_logs" {
  source       = "../../modules/s3_logs"
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



# Scan Lambdas
module "get_idle_ec2" {
  source                = "../../modules/lambda"
  function_name         = "getIdleEC2"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /finops/ec2/idle"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    LOG_BUCKET = module.s3_logs.bucket_id
  }
  filename              = "../../../builds/get_idle_ec2.zip"
  source_code_hash      = filebase64sha256("../../../builds/get_idle_ec2.zip")
}

module "get_unattached_ebs" {
  source                = "../../modules/lambda"
  function_name         = "getUnattachedEBS"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /finops/ebs/unattached"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    LOG_BUCKET = module.s3_logs.bucket_id
  }
  filename              = "../../../builds/get_unattached_ebs.zip"
  source_code_hash      = filebase64sha256("../../../builds/get_unattached_ebs.zip")
}

module "check_s3_public" {
  source                = "../../modules/lambda"
  function_name         = "checkS3Public"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /secops/s3"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    LOG_BUCKET = module.s3_logs.bucket_id
  }
  filename              = "../../../builds/check_s3_public.zip"
  source_code_hash      = filebase64sha256("../../../builds/check_s3_public.zip")
}

module "check_sg_open" {
  source                = "../../modules/lambda"
  function_name         = "checkSGOpen"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /secops/sg"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    LOG_BUCKET = module.s3_logs.bucket_id
  }
  filename              = "../../../builds/check_sg_open.zip"
  source_code_hash      = filebase64sha256("../../../builds/check_sg_open.zip")
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
  filename              = "../../../builds/ses_notifier.zip"
  source_code_hash      = filebase64sha256("../../../builds/ses_notifier.zip")
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
  filename         = "../../../builds/toggle_scheduler.zip"
  source_code_hash = filebase64sha256("../../../builds/toggle_scheduler.zip")
}

module "automation" {
  source               = "../../modules/automation"
  project_name         = var.project_name
  notifier_lambda_arn  = module.ses_notifier.lambda_arn
  notifier_lambda_name = module.ses_notifier.lambda_name
}



module "scan_services" {
  source                = "../../modules/lambda"
  function_name         = "scanServices"
  handler               = "lambda_function.lambda_handler"
  role_arn              = module.iam.lambda_role_arn
  api_id                = module.api_gateway.api_id
  route_key             = "GET /finops/scan"
  authorizer_id         = module.api_gateway.authorizer_id
  environment_variables = {
    LOG_BUCKET = module.s3_logs.bucket_id
  }
  filename              = "../../../builds/scan_services.zip"
  source_code_hash      = filebase64sha256("../../../builds/scan_services.zip")
}


