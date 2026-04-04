resource "aws_lambda_function" "func" {
  function_name = var.function_name
  handler       = var.handler
  runtime       = var.runtime
  role          = var.role_arn
  
  # Deployment package
  filename         = var.filename
  source_code_hash = var.source_code_hash

  environment {
    variables = var.environment_variables
  }

  timeout       = 30

}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = var.api_id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.func.invoke_arn
}

resource "aws_apigatewayv2_route" "route" {
  api_id             = var.api_id
  route_key          = var.route_key
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.func.function_name
  principal     = "apigateway.amazonaws.com"
}
