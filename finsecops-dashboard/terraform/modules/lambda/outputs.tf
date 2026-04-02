output "function_arn" {
  value = aws_lambda_function.func.arn
}

output "function_name" {
  value = aws_lambda_function.func.function_name
}

output "invoke_arn" {
  value = aws_lambda_function.func.invoke_arn
}
