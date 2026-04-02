resource "aws_cloudwatch_event_rule" "daily_scan" {
  name                = "${var.project_name}-daily-scan"
  description         = "Trigger daily resource scan and email report"
  schedule_expression = var.schedule_expression
  state               = "ENABLED"
}

resource "aws_cloudwatch_event_target" "notifier" {
  rule      = aws_cloudwatch_event_rule.daily_scan.name
  target_id = "SESNotifier"
  arn       = var.notifier_lambda_arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = var.notifier_lambda_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_scan.arn
}

output "rule_name" {
  value = aws_cloudwatch_event_rule.daily_scan.name
}

output "rule_arn" {
  value = aws_cloudwatch_event_rule.daily_scan.arn
}
