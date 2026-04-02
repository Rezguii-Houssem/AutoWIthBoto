resource "aws_cloudwatch_event_rule" "daily_scan" {
  name                = "${var.project_name}-daily-scan"
  description         = "Triggers AWS resource scans daily"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "target" {
  rule      = aws_cloudwatch_event_rule.daily_scan.name
  target_id = "LambdaTarget"
  arn       = var.lambda_arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_scan.arn
}
