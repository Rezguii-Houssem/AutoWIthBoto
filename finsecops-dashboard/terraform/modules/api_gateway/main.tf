resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}_API"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "dev"
  auto_deploy = true
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "CognitoAuthorizer"

  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://${var.cognito_issuer}"
  }
}
