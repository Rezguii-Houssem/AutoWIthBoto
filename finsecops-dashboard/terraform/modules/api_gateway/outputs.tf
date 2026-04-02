output "api_id" {
  value = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "authorizer_id" {
  value = aws_apigatewayv2_authorizer.cognito.id
}
